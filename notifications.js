/**
 * ============================================================================
 * YARID Notifications System
 * ============================================================================
 *
 * - Demande de permission de notification
 * - Notifications Push reçues du Service Worker
 * - Rappels de panier (local notifications basées sur l'inactivité)
 * - Synchronisation Background Sync pour actions hors-ligne
 * ============================================================================
 */

const YARID_NOTIFICATIONS = {
  // État
  permission: 'default',
  reminderTimer: null,
  CART_REMINDER_DELAY: 15 * 60 * 1000, // 15 minutes d'inactivité
  SYNC_TAG: 'yarid-sync-queue',

  /**
   * Initialise le système de notifications
   */
  init() {
    this.checkPermission();
    this.setupCartReminder();
    this.listenToPushMessages();
    this.registerBackgroundSync();

    // Demande automatique de permission après 3 secondes (si jamais demandée)
    setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'default') {
        this.requestPermission();
      }
    }, 3000);

    // Écouter les changements de visibilité
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.clearCartReminder();
      } else {
        this.scheduleCartReminder();
      }
    });
  },

  /**
   * Vérifie l'état actuel de la permission
   */
  async checkPermission() {
    if (!('Notification' in window)) {
      console.log('[YARID] Notifications non supportees');
      return 'unsupported';
    }
    this.permission = Notification.permission;
    this.updatePermissionUI();
    return this.permission;
  },

  /**
   * Demande la permission de notification (bouton CTA)
   * @returns {Promise<string>}
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      alert(t('notif.denied'));
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      this.updatePermissionUI();

      if (result === 'granted') {
        // Enregistrer le push subscription
        await this.subscribeToPush();
        this.showLocalNotification({
          title: 'YARID',
          body: t('notif.enabled'),
          icon: '/icons/android-chrome-192x192.png',
          badge: '/icons/favicon-32x32.png'
        });
      }
      return result;
    } catch (err) {
      console.error('[YARID] Erreur permission:', err);
      return 'denied';
    }
  },

  /**
   * Souscrit au service Push (pour notifications serveur)
   */
  async subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BEl62iMfaW0Lh8ix-6OkEC_n0N4_w9H3c0S0yUU0GnyLPwPwY5uPZUW3U5L3Zp0H_Pv5wzQBR8oRZw93j4ZWKo' // Clé VAPID publique (à remplacer par la vôtre)
        )
      });

      // Sauvegarder la subscription (optionnel: envoyer au serveur)
      localStorage.setItem('yarid_push_subscription', JSON.stringify(subscription));
      console.log('[YARID] Push subscription enregistree');

    } catch (err) {
      console.error('[YARID] Erreur push subscription:', err);
    }
  },

  /**
   * Affiche une notification locale (ne nécessite pas de serveur)
   * @param {Object} options
   */
  async showLocalNotification(options) {
    if (Notification.permission !== 'granted') return;
    if (!navigator.serviceWorker) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(options.title || 'YARID', {
        body: options.body || '',
        icon: options.icon || '/icons/android-chrome-192x192.png',
        badge: options.badge || '/icons/favicon-32x32.png',
        tag: options.tag || 'yarid-notification',
        requireInteraction: options.requireInteraction || false,
        actions: options.actions || [],
        data: options.data || { url: '/index.html' }
      });
    } catch (err) {
      console.error('[YARID] Erreur notification:', err);
    }
  },

  /**
   * Écoute les messages push du Service Worker
   */
  listenToPushMessages() {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        console.log('[YARID] Message push recu:', event.data);
        // Mettre à jour l'UI si nécessaire
        if (event.data.url) {
          window.location.href = event.data.url;
        }
      }
      if (event.data?.type === 'SYNC_COMPLETE') {
        console.log('[YARID] Synchronisation terminee:', event.data);
      }
    });
  },

  /**
   * Enregistre un tag de Background Sync
   * @param {string} tag
   */
  async sync(tag = 'yarid-sync') {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.log('[YARID] Background Sync non supporte');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log(`[YARID] Sync tag "${tag}" enregistre`);
      return true;
    } catch (err) {
      console.error('[YARID] Erreur sync:', err);
      return false;
    }
  },

  /**
   * Registre le Background Sync
   */
  async registerBackgroundSync() {
    // Vérifier périodiquement les actions en attente
    setInterval(() => this.processPendingActions(), 30000);
  },

  /**
   * Ajoute une action à la file d'attente pour synchronisation
   * @param {Object} action
   */
  queueAction(action) {
    const queue = JSON.parse(localStorage.getItem('yarid_sync_queue') || '[]');
    queue.push({
      ...action,
      timestamp: Date.now(),
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    });
    localStorage.setItem('yarid_sync_queue', JSON.stringify(queue));
    // Déclencher le sync
    this.sync('yarid-sync');
  },

  /**
   * Traite les actions en attente
   */
  async processPendingActions() {
    const queue = JSON.parse(localStorage.getItem('yarid_sync_queue') || '[]');
    if (queue.length === 0) return;
    if (!navigator.onLine) return;

    const processed = [];
    for (const action of queue) {
      try {
        switch (action.type) {
          case 'REFERRAL_REGISTER':
            if (window.referralSystem?.registerParrainDirectly) {
              await window.referralSystem.registerParrainDirectly(action.phone, action.name);
            }
            break;
          case 'REFERRAL_LOGIN':
            if (window.referralSystem?.loginParrain) {
              await window.referralSystem.loginParrain(action.phone);
            }
            break;
          case 'CONTACT_FORM':
            // Traiter le formulaire de contact
            break;
        }
        processed.push(action.id);
      } catch (err) {
        console.error('[YARID] Erreur traitement action:', err);
      }
    }

    // Retirer les actions traitées
    if (processed.length > 0) {
      const remaining = queue.filter(a => !processed.includes(a.id));
      localStorage.setItem('yarid_sync_queue', JSON.stringify(remaining));
      console.log(`[YARID] ${processed.length} actions synchronisees`);
    }
  },

  // ============================================================================
  // RAPPELS DE PANIER
  // ============================================================================

  /**
   * Programme un rappel de panier après inactivité
   */
  scheduleCartReminder() {
    this.clearCartReminder();

    const cart = JSON.parse(localStorage.getItem('yarid_cart') || '[]');
    if (cart.length === 0) return; // Pas de panier = pas de rappel

    // Sauvegarder le timestamp de départ de l'inactivité
    localStorage.setItem('yarid_cart_reminder_start', Date.now().toString());

    this.reminderTimer = setTimeout(() => {
      this.showCartReminder(cart);
    }, this.CART_REMINDER_DELAY);
  },

  /**
   * Annule le rappel de panier
   */
  clearCartReminder() {
    if (this.reminderTimer) {
      clearTimeout(this.reminderTimer);
      this.reminderTimer = null;
    }
    localStorage.removeItem('yarid_cart_reminder_start');
  },

  /**
   * Affiche le rappel de panier
   */
  async showCartReminder(cart) {
    if (Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return; // Ne pas spammer si l'user est actif

    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

    await this.showLocalNotification({
      title: t('notif.cart_reminder'),
      body: `${totalItems} article(s) dans votre panier — Total: ${totalPrice.toLocaleString()} FCFA`,
      icon: '/icons/android-chrome-192x192.png',
      badge: '/icons/favicon-32x32.png',
      tag: 'cart-reminder',
      requireInteraction: false,
      actions: [
        { action: 'open_cart', title: 'Voir le panier' },
        { action: 'dismiss', title: 'Ignorer' }
      ],
      data: { url: '/index.html', type: 'cart_reminder' }
    });
  },

  /**
   * Mise à jour de l'UI de permission
   */
  updatePermissionUI() {
    const btn = document.getElementById('notif-permission-btn');
    if (!btn) return;

    switch (this.permission) {
      case 'granted':
        btn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          ${t('notif.enabled')}
        `;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.disabled = true;
        break;
      case 'denied':
        btn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          ${t('notif.denied')}
        `;
        btn.classList.add('opacity-50');
        break;
      default:
        btn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          ${t('notif.permission')}
        `;
    }
  },

  /**
   * Utilitaire: Base64URL -> Uint8Array (pour VAPID key)
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  }
};

// ============================================================================
// FONCTIONS GLOBALES
// ============================================================================

/**
 * Demande la permission de notification (bouton UI)
 */
async function requestNotificationPermission() {
  return await YARID_NOTIFICATIONS.requestPermission();
}

/**
 * Affiche une notification locale
 */
async function showNotification(title, body, options = {}) {
  return await YARID_NOTIFICATIONS.showLocalNotification({
    title, body, ...options
  });
}

/**
 * Enregistre une action pour synchronisation
 */
function queueSyncAction(action) {
  YARID_NOTIFICATIONS.queueAction(action);
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  YARID_NOTIFICATIONS.init();
});

// Exposition globale
window.YARID_NOTIFICATIONS = YARID_NOTIFICATIONS;
window.requestNotificationPermission = requestNotificationPermission;
window.showNotification = showNotification;
window.queueSyncAction = queueSyncAction;
