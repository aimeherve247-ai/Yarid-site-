/**
 * ============================================================================
 * YARID i18n - Système de traduction Fr/En
 * ============================================================================
 *
 * Utilisation:
 *   1. Attributs data-i18n dans le HTML: <span data-i18n="key"></span>
 *   2. Textes dynamiques: i18n.t('key')
 *   3. Bascule: switchLanguage('en') ou switchLanguage('fr')
 *
 * Le choix est persisté dans localStorage ('yarid_lang')
 * ============================================================================
 */

const I18N = {
  // Dictionnaire de traductions
  translations: {
    fr: {
      // Navigation
      'nav.home': 'Accueil',
      'nav.categories': 'Categories',
      'nav.cart': 'Panier',
      'nav.account': 'Compte',
      'nav.services': 'Services',
      'nav.contact': 'Contact',

      // Hero / Accueil
      'hero.welcome': 'Bienvenue sur YARID',
      'hero.subtitle': 'Votre destination pour des produits premium au Cameroun',
      'hero.cta': 'Decouvrir',
      'hero.promo': 'Voir les promotions',

      // Categories
      'categories.title': 'Nos Categories',
      'categories.all': 'Tout',
      'categories.phones': 'Telephones',
      'categories.shoes': 'Chaussures',
      'categories.watches': 'Montres',
      'categories.perfumes': 'Parfums',
      'categories.bags': 'Sacs',
      'categories.electronics': 'Electronique',

      // Produits
      'products.title': 'Nos Produits',
      'products.add_cart': 'Ajouter au panier',
      'products.buy_whatsapp': 'WhatsApp',
      'products.view_details': 'Voir details',
      'products.in_stock': 'En stock',
      'products.out_stock': 'Rupture',
      'products.search': 'Rechercher un produit...',
      'products.no_results': 'Aucun produit trouve',

      // Panier
      'cart.title': 'Mon Panier',
      'cart.empty': 'Votre panier est vide',
      'cart.subtotal': 'Sous-total',
      'cart.total': 'Total',
      'cart.checkout': 'Commander via WhatsApp',
      'cart.continue': 'Continuer vos achats',
      'cart.quantity': 'Quantite',
      'cart.remove': 'Retirer',
      'cart.added': 'Ajoute au panier !',

      // Parrainage
      'referral.title': 'Programme de Parrainage',
      'referral.create_account': 'Creer mon compte',
      'referral.login': 'Se connecter',
      'referral.phone': 'Numero WhatsApp',
      'referral.name': 'Votre nom',
      'referral.code': 'Code de parrainage',
      'referral.share': 'Partager mon code',
      'referral.copy': 'Copier',
      'referral.invite': 'Invitez vos amis et gagnez 2000 FCFA par filleul !',
      'referral.register_btn': 'Creer mon compte',
      'referral.login_btn': 'Se connecter',

      // Services
      'services.title': 'Nos Services',
      'services.btp': 'BTP & Materiaux',
      'services.digital': 'Digital & Tech',
      'services.sourcing': 'Sourcing Mondial',
      'services.desc': 'Des solutions professionnelles pour vos projets',

      // Contact
      'contact.title': 'Contactez-nous',
      'contact.subtitle': 'Nous sommes a votre ecoute',
      'contact.name': 'Nom',
      'contact.email': 'Email',
      'contact.message': 'Message',
      'contact.send': 'Envoyer',
      'contact.whatsapp': 'Nous contacter sur WhatsApp',

      // Notifications
      'notif.permission': 'Activer les notifications',
      'notif.enabled': 'Notifications activees',
      'notif.denied': 'Notifications refusees',
      'notif.cart_reminder': 'Vous avez des articles dans votre panier !',
      'notif.new_product': 'Nouveau produit disponible !',

      // Actions globales
      'action.retry': 'Reessayer',
      'action.back': 'Retour',
      'action.close': 'Fermer',
      'action.share': 'Partager',
      'action.copy': 'Copier',
      'action.copied': 'Copie !',
      'action.save': 'Sauvegarder',
      'action.cancel': 'Annuler',
      'action.confirm': 'Confirmer',
      'action.load_more': 'Charger plus',
      'action.see_all': 'Voir tout',

      // Footer
      'footer.rights': 'Tous droits reserves',
      'footer.privacy': 'Confidentialite',
      'footer.terms': 'Conditions',

      // Langues
      'lang.fr': 'Francais',
      'lang.en': 'Anglais',
      'lang.switch': 'Changer de langue',

      // Offline
      'offline.title': 'Vous etes hors connexion',
      'offline.subtitle': 'Pas de panique ! Vous pouvez consulter vos articles en cache.',
      'offline.retry': 'Reessayer',
      'offline.home': "Retour a l'accueil",

      // Web Share
      'share.title': 'Partager ce produit',
      'share.text': 'Decouvre ce produit sur YARID',
    },

    en: {
      // Navigation
      'nav.home': 'Home',
      'nav.categories': 'Categories',
      'nav.cart': 'Cart',
      'nav.account': 'Account',
      'nav.services': 'Services',
      'nav.contact': 'Contact',

      // Hero / Home
      'hero.welcome': 'Welcome to YARID',
      'hero.subtitle': 'Your destination for premium products in Cameroon',
      'hero.cta': 'Discover',
      'hero.promo': 'See promotions',

      // Categories
      'categories.title': 'Our Categories',
      'categories.all': 'All',
      'categories.phones': 'Phones',
      'categories.shoes': 'Shoes',
      'categories.watches': 'Watches',
      'categories.perfumes': 'Perfumes',
      'categories.bags': 'Bags',
      'categories.electronics': 'Electronics',

      // Products
      'products.title': 'Our Products',
      'products.add_cart': 'Add to cart',
      'products.buy_whatsapp': 'WhatsApp',
      'products.view_details': 'View details',
      'products.in_stock': 'In stock',
      'products.out_stock': 'Out of stock',
      'products.search': 'Search a product...',
      'products.no_results': 'No products found',

      // Cart
      'cart.title': 'My Cart',
      'cart.empty': 'Your cart is empty',
      'cart.subtotal': 'Subtotal',
      'cart.total': 'Total',
      'cart.checkout': 'Order via WhatsApp',
      'cart.continue': 'Continue shopping',
      'cart.quantity': 'Quantity',
      'cart.remove': 'Remove',
      'cart.added': 'Added to cart!',

      // Referral
      'referral.title': 'Referral Program',
      'referral.create_account': 'Create account',
      'referral.login': 'Login',
      'referral.phone': 'WhatsApp number',
      'referral.name': 'Your name',
      'referral.code': 'Referral code',
      'referral.share': 'Share my code',
      'referral.copy': 'Copy',
      'referral.invite': 'Invite friends and earn 2000 FCFA per referral!',
      'referral.register_btn': 'Create account',
      'referral.login_btn': 'Login',

      // Services
      'services.title': 'Our Services',
      'services.btp': 'Construction & Materials',
      'services.digital': 'Digital & Tech',
      'services.sourcing': 'Global Sourcing',
      'services.desc': 'Professional solutions for your projects',

      // Contact
      'contact.title': 'Contact Us',
      'contact.subtitle': 'We are here to help',
      'contact.name': 'Name',
      'contact.email': 'Email',
      'contact.message': 'Message',
      'contact.send': 'Send',
      'contact.whatsapp': 'Contact us on WhatsApp',

      // Notifications
      'notif.permission': 'Enable notifications',
      'notif.enabled': 'Notifications enabled',
      'notif.denied': 'Notifications denied',
      'notif.cart_reminder': 'You have items in your cart!',
      'notif.new_product': 'New product available!',

      // Global actions
      'action.retry': 'Retry',
      'action.back': 'Back',
      'action.close': 'Close',
      'action.share': 'Share',
      'action.copy': 'Copy',
      'action.copied': 'Copied!',
      'action.save': 'Save',
      'action.cancel': 'Cancel',
      'action.confirm': 'Confirm',
      'action.load_more': 'Load more',
      'action.see_all': 'See all',

      // Footer
      'footer.rights': 'All rights reserved',
      'footer.privacy': 'Privacy',
      'footer.terms': 'Terms',

      // Languages
      'lang.fr': 'French',
      'lang.en': 'English',
      'lang.switch': 'Change language',

      // Offline
      'offline.title': 'You are offline',
      'offline.subtitle': "Don't worry! You can still browse cached items.",
      'offline.retry': 'Retry',
      'offline.home': 'Back to home',

      // Web Share
      'share.title': 'Share this product',
      'share.text': 'Check out this product on YARID',
    }
  },

  // Langue courante
  currentLang: 'fr',

  /**
   * Initialise le système i18n
   */
  init() {
    // 1. Vérifier le localStorage d'abord (choix explicite de l'utilisateur)
    const saved = localStorage.getItem('yarid_lang');
    // 2. Sinon détecter la langue du navigateur
    const browserLang = navigator.language || navigator.userLanguage;
    const detectedLang = browserLang && browserLang.startsWith('en') ? 'en' : 'fr';
    // 3. Appliquer la langue (priorité: saved > detected)
    const lang = (saved && this.translations[saved]) ? saved : detectedLang;
    this.currentLang = lang;
    document.documentElement.lang = lang;
    localStorage.setItem('yarid_lang', lang);
    // Appliquer les traductions
    this.apply();
  },

  /**
   * Retourne la traduction pour une clé
   * @param {string} key - Clé de traduction (ex: 'nav.home')
   * @param {Object} vars - Variables de substitution optionnelles
   * @returns {string}
   */
  t(key, vars = {}) {
    let text = this.translations[this.currentLang]?.[key]
      || this.translations['fr']?.[key]
      || key;

    // Substitution de variables {varName}
    Object.keys(vars).forEach(v => {
      text = text.replace(new RegExp(`{${v}}`, 'g'), vars[v]);
    });

    return text;
  },

  /**
   * Bascule la langue
   * @param {string} lang - 'fr' ou 'en'
   */
  switchLanguage(lang) {
    if (!this.translations[lang]) return;
    this.currentLang = lang;
    localStorage.setItem('yarid_lang', lang);
    document.documentElement.lang = lang;
    this.apply();
    // Mettre à jour l'apparence des boutons dans le modal Compte
    this.updateLangButtons();

    // Event pour les scripts externes
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  },

  /**
   * Applique les traductions à tous les éléments [data-i18n]
   */
  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;

      const text = this.t(key);

      // Attributs spéciaux
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) {
        el.setAttribute(attr, text);
      } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });

    // Mise à jour du sélecteur de langue
    const selector = document.getElementById('lang-selector');
    if (selector) selector.value = this.currentLang;
  },

  /**
   * Met à jour l'apparence des boutons FR/EN dans le modal Compte
   */
  updateLangButtons() {
    const frBtn = document.getElementById('btn-lang-fr');
    const enBtn = document.getElementById('btn-lang-en');
    if (!frBtn || !enBtn) return;
    if (this.currentLang === 'fr') {
      frBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-lg transition';
      enBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition';
    } else {
      enBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-lg transition';
      frBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition';
    }
  }
};

/**
 * Fonction globale de traduction (raccourci)
 * @param {string} key
 * @param {Object} vars
 * @returns {string}
 */
function t(key, vars) {
  return I18N.t(key, vars);
}

/**
 * Bascule la langue (globale)
 * @param {string} lang
 */
function switchLanguage(lang) {
  I18N.switchLanguage(lang);
}

// Initialisation auto au DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  I18N.init();
});

// Exposition globale
window.I18N = I18N;
window.t = t;
window.switchLanguage = switchLanguage;
