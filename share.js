/**
 * ============================================================================
 * YARID Web Share API
 * Partage natif des produits (WhatsApp, Instagram, etc.)
 * Fallback: partage via URL copiée
 * ============================================================================
 */

const YARID_SHARE = {
  /**
   * Partage un produit via le menu natif du smartphone
   * @param {Object} product - { id, name, price, image_url, description }
   * @returns {Promise<boolean>}
   */
  async shareProduct(product) {
    if (!product) return false;

    const name = product.name || product.nom || 'Produit YARID';
    const price = Number(product.price || product.prix || 0).toLocaleString();
    const url = `${window.location.origin}/category-view.html?cat=${encodeURIComponent(product.categorie || '')}&product=${product.id}`;
    const text = `${t('share.text')}\n\n${name}\n${price} FCFA\n\n${url}`;

    // Essayer le Web Share API natif
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t('share.title')} — ${name}`,
          text: text,
          url: url
        });
        console.log('[YARID] Produit partage via Web Share API');
        this.trackShare(product.id, 'native');
        return true;
      } catch (err) {
        // User cancelled or share failed → fallback
        if (err.name !== 'AbortError') {
          console.error('[YARID] Share error:', err);
        }
      }
    }

    // Fallback: copier le lien dans le presse-papier
    return this.copyToClipboard(url, text, product);
  },

  /**
   * Partage uniquement sur WhatsApp
   * @param {Object} product
   */
  async shareViaWhatsApp(product) {
    if (!product) return;
    const name = product.name || product.nom || 'Produit YARID';
    const price = Number(product.price || product.prix || 0).toLocaleString();
    const url = `${window.location.origin}/category-view.html?cat=${encodeURIComponent(product.categorie || '')}&product=${product.id}`;
    const text = encodeURIComponent(
      `\u{1F525} *${name}*\n` +
      `\u{1F4B0} ${price} FCFA\n` +
      `\n${url}\n` +
      `\nVia YARID \u{1F4F1}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    this.trackShare(product.id, 'whatsapp');
  },

  /**
   * Copie le lien dans le presse-papier (fallback)
   * @param {string} url
   * @param {string} text
   * @param {Object} product
   */
  async copyToClipboard(url, text, product) {
    try {
      await navigator.clipboard.writeText(text || url);
      this.showToast(t('action.copied'));
      this.trackShare(product.id, 'clipboard');
      return true;
    } catch (err) {
      // Fallback final: sélection manuelle
      const textarea = document.createElement('textarea');
      textarea.value = text || url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showToast(t('action.copied'));
      this.trackShare(product.id, 'clipboard');
      return true;
    }
  },

  /**
   * Affiche un toast de confirmation
   * @param {string} message
   */
  showToast(message) {
    const existing = document.querySelector('.share-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #0f172a;
      color: white;
      padding: 12px 24px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 600;
      z-index: 9999;
      opacity: 0;
      transition: all 0.3s ease;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    toast.innerHTML = `
      <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      ${message}
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  },

  /**
   * Génère le HTML d'un bouton de partage pour les cartes produits
   * @param {Object} product
   * @param {string} type - 'icon' | 'button' | 'full'
   * @returns {string}
   */
  renderShareButton(product, type = 'icon') {
    const safeId = (product.id || '').toString().replace(/'/g, "\\'");
    const safeName = (product.name || product.nom || '').replace(/'/g, "\\'");
    const safeImage = (product.image_url || '').replace(/'/g, "\\'");

    const onclick = `event.stopPropagation(); shareProductById('${safeId}', '${safeName}', ${product.price || product.prix || 0}, '${safeImage}', '${product.categorie || ''}')`;

    if (type === 'icon') {
      return `
        <button onclick="${onclick}" class="share-btn p-2 rounded-full hover:bg-slate-100 transition" title="${t('action.share')}">
          <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
        </button>
      `;
    }

    return `
      <button onclick="${onclick}" class="share-btn flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-sky-500 transition">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
        </svg>
        ${t('action.share')}
      </button>
    `;
  },

  /**
   * Tracking analytics
   */
  trackShare(productId, method) {
    if (typeof trackReferralAction === 'function') {
      trackReferralAction('share_product', { productId, method });
    }
  }
};

// ─── FONCTIONS GLOBALES ─────────────────────────────────────────────────────

/**
 * Partage un produit par ID (utilisé dans les attributs onclick HTML)
 */
async function shareProductById(id, name, price, imageUrl, category) {
  const product = { id, name, price, image_url: imageUrl, categorie: category };
  await YARID_SHARE.shareProduct(product);
}

/**
 * Partage via WhatsApp (utilisé dans les attributs onclick HTML)
 */
async function shareProductWhatsApp(id, name, price, category) {
  const product = { id, name, price, categorie: category };
  await YARID_SHARE.shareViaWhatsApp(product);
}

/**
 * Partage un produit complet (objet)
 */
async function shareProduct(product) {
  await YARID_SHARE.shareProduct(product);
}

// Exposition globale
window.YARID_SHARE = YARID_SHARE;
window.shareProduct = shareProduct;
window.shareProductById = shareProductById;
window.shareProductWhatsApp = shareProductWhatsApp;
