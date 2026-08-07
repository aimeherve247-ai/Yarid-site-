
/**
 * ============================================================================
 * YARID - yarid-checkout.js (v2 - renforce)
 * A charger en DERNIER, juste avant </body>, sur TOUTES les pages :
 *   - index.html / produit-detail.html / categories.html / category-view.html
 *
 * v2 : chaque etape est isolee par try/catch. Si une etape echoue, les
 * suivantes s'executent quand meme -> les boutons Commander / WhatsApp Direct
 * ne peuvent plus rester "morts" a cause d'une erreur ailleurs dans le script.
 * ============================================================================
 */
(function () {
    const WHATSAPP_NUMBER = '237655959284';

    function safe(label, fn) {
        try { fn(); } catch (e) { console.error('[YARID yarid-checkout.js] Erreur dans "' + label + '":', e); }
    }

    // ------------------------------------------------------------------------
    // 0. CSS injectee
    // ------------------------------------------------------------------------
    safe('injection CSS', function () {
        if (document.getElementById('yarid-checkout-style')) return;
        var style = document.createElement('style');
        style.id = 'yarid-checkout-style';
        style.textContent =
            '#cart-drawer.open{transform:translateX(0) !important;}' +
            '.yarid-checkout-modal{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:none;align-items:flex-end;justify-content:center;backdrop-filter:blur(3px);}' +
            '.yarid-checkout-modal.active{display:flex;}' +
            '.yarid-modal-inner{background:#fff;border-radius:1.5rem 1.5rem 0 0;max-height:90vh;overflow-y:auto;width:100%;max-width:480px;animation:yaridSlideUp .3s ease;}' +
            '@keyframes yaridSlideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}' +
            '.yarid-field{width:100%;padding:1rem;border-radius:1rem;border:1.5px solid #e2e8f0;font-size:14px;font-weight:600;outline:none;margin-bottom:0.75rem;}' +
            '.yarid-field:focus{border-color:#0ea5e9;}' +
            '.yarid-choice-btn{padding:1rem;border-radius:1rem;border:2px solid #e2e8f0;background:#fff;color:#475569;text-align:center;cursor:pointer;}' +
            '.yarid-choice-btn.yarid-selected{border-color:#0f172a;background:#0f172a;color:#fff;}';
        document.head.appendChild(style);
    });

    // ------------------------------------------------------------------------
    // 1. Utilitaires panier
    // ------------------------------------------------------------------------
    function getCart() {
        try { return JSON.parse(localStorage.getItem('yarid_cart')) || []; }
        catch (e) { return []; }
    }
    function saveCart(cart) { localStorage.setItem('yarid_cart', JSON.stringify(cart)); }
    function getCartSubtotal() {
        return getCart().reduce(function (sum, item) {
            var price = parseInt(item.price || item.prix || 0);
            var qty = parseInt(item.quantity || 1);
            return sum + price * qty;
        }, 0);
    }
    window.getCartSubtotal = getCartSubtotal;

    function silentAddToCart(item, qty) {
        var cart = getCart();
        var existing = cart.find(function (i) { return i.id === item.id && i.name === item.name; });
        if (existing) existing.quantity = (existing.quantity || 1) + qty;
        else { item.quantity = qty; cart.push(item); }
        saveCart(cart);
        if (typeof updateCartUI === 'function') { try { updateCartUI(); } catch (e) {} }
    }

    // ------------------------------------------------------------------------
    // 2. Tiroir panier
    // ------------------------------------------------------------------------
    safe('definition toggleCart / renderCartItems', function () {
        window.toggleCart = function () {
            var drawer = document.getElementById('cart-drawer');
            var overlay = document.getElementById('cart-overlay');
            if (!drawer) return;
            var isOpen = drawer.classList.contains('open');
            drawer.classList.toggle('open', !isOpen);
            if (overlay) {
                overlay.classList.toggle('active', !isOpen);
                overlay.style.display = !isOpen ? 'block' : 'none';
            }
            if (typeof window.renderCartItems === 'function') window.renderCartItems();
        };

        window.renderCartItems = function () {
            var cart = getCart();
            var container = document.getElementById('cart-items') || document.getElementById('cart-drawer-items');

            if (container) {
                if (cart.length === 0) {
                    container.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:2rem 0;">Panier vide.</p>';
                } else {
                    container.innerHTML = cart.map(function (item, index) {
                        var price = parseInt(item.price || item.prix || 0);
                        var qty = parseInt(item.quantity || 1);
                        var img = item.image || item.image_url || 'https://via.placeholder.com/60';
                        var name = item.name || item.nom || 'Produit';
                        return '<div style="display:flex;align-items:center;gap:0.75rem;background:#fff;padding:0.75rem;border-radius:0.75rem;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #f1f5f9;margin-bottom:0.75rem;">' +
                            '<img src="' + img + '" style="width:56px;height:56px;object-fit:cover;border-radius:0.5rem;background:#f8fafc;flex-shrink:0;">' +
                            '<div style="flex:1;min-width:0;">' +
                            '<p style="font-size:13px;font-weight:700;color:#1e293b;">' + name + '</p>' +
                            '<p style="font-size:12px;color:#0369a1;font-weight:800;margin-top:2px;">' + price.toLocaleString() + ' FCFA</p>' +
                            '<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.4rem;">' +
                            '<button onclick="updateQty(' + index + ',-1)" style="width:26px;height:26px;border:1px solid #e2e8f0;border-radius:0.4rem;font-weight:700;background:#fff;">-</button>' +
                            '<span style="font-size:12px;font-weight:700;min-width:16px;text-align:center;">' + qty + '</span>' +
                            '<button onclick="updateQty(' + index + ',1)" style="width:26px;height:26px;border:1px solid #e2e8f0;border-radius:0.4rem;font-weight:700;background:#fff;">+</button>' +
                            '</div></div>' +
                            '<button onclick="removeFromCart(' + index + ')" style="color:#ef4444;padding:0.4rem;flex-shrink:0;">' +
                            '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' +
                            '</button></div>';
                    }).join('');
                }
            }

            var subtotal = getCartSubtotal();
            var totalEl = document.getElementById('cart-total');
            var subtotalEl = document.getElementById('cart-subtotal');
            var deliveryEl = document.getElementById('cart-delivery');
            if (totalEl) totalEl.textContent = subtotal.toLocaleString() + ' FCFA';
            if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString() + ' FCFA';
            if (deliveryEl) deliveryEl.textContent = '0 FCFA';
        };
    });

    // ------------------------------------------------------------------------
    // 3. Modal de commande (injection best-effort, ne bloque jamais la suite)
    // ------------------------------------------------------------------------
    function injectCheckoutModalIfMissing() {
        var existing = document.getElementById('checkout-modal');
        if (existing) {
            existing.classList.add('yarid-checkout-modal');
            return;
        }
        var modal = document.createElement('div');
        modal.className = 'yarid-checkout-modal';
        modal.id = 'checkout-modal';
        modal.setAttribute('onclick', "if(event.target===this) closeCheckout()");
        modal.innerHTML =
            '<div class="yarid-modal-inner">' +
            '  <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem;border-bottom:1px solid #f1f5f9;">' +
            '    <h2 style="font-size:1.1rem;font-weight:900;font-style:italic;text-transform:uppercase;margin:0;">Finaliser la commande</h2>' +
            '    <button onclick="closeCheckout()" style="padding:0.5rem;border-radius:9999px;border:none;background:transparent;">' +
            '      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
            '    </button>' +
            '  </div>' +
            '  <div style="padding:1rem;">' +
            '    <div style="background:#f8fafc;border-radius:1rem;padding:1rem;margin-bottom:1rem;">' +
            '      <p style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.75rem;">Recapitulatif</p>' +
            '      <div id="checkout-items" style="display:flex;flex-direction:column;gap:0.5rem;font-size:14px;"></div>' +
            '      <div style="border-top:1px solid #e2e8f0;padding-top:0.5rem;margin-top:0.5rem;display:flex;justify-content:space-between;font-weight:800;">' +
            '        <span>Total</span><span style="color:#0369a1;" id="checkout-total">0 FCFA</span>' +
            '      </div>' +
            '    </div>' +
            '    <p style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.5rem;">Vos informations</p>' +
            '    <input type="text" id="checkout-nom" placeholder="Nom complet" class="yarid-field">' +
            '    <input type="tel" id="checkout-tel" placeholder="Telephone (WhatsApp)" class="yarid-field">' +
            '    <input type="text" id="checkout-adresse" placeholder="Quartier / Ville / Repere" class="yarid-field">' +
            '    <p style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:0.5rem 0;">Livraison</p>' +
            '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">' +
            '      <button type="button" onclick="setCheckoutDelivery(\'retrait\')" id="btn-checkout-retrait" class="yarid-choice-btn yarid-selected">' +
            '        <p style="font-size:12px;font-weight:800;margin:0;">Retrait</p><p style="font-size:10px;opacity:0.8;margin:2px 0 0;">Gratuit</p>' +
            '      </button>' +
            '      <button type="button" onclick="setCheckoutDelivery(\'domicile\')" id="btn-checkout-domicile" class="yarid-choice-btn">' +
            '        <p style="font-size:12px;font-weight:800;margin:0;">Domicile</p><p style="font-size:10px;opacity:0.8;margin:2px 0 0;">+2000 FCFA</p>' +
            '      </button>' +
            '    </div>' +
            '    <p style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:0.5rem 0;">Paiement</p>' +
            '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
            '      <button type="button" onclick="setCheckoutPayment(\'especes\')" id="btn-checkout-especes" class="yarid-choice-btn yarid-selected">' +
            '        <p style="font-size:12px;font-weight:800;margin:0;">Cash</p><p style="font-size:10px;opacity:0.8;margin:2px 0 0;">A la livraison</p>' +
            '      </button>' +
            '      <button type="button" onclick="setCheckoutPayment(\'mobile\')" id="btn-checkout-mobile" class="yarid-choice-btn">' +
            '        <p style="font-size:12px;font-weight:800;margin:0;">Mobile Money</p><p style="font-size:10px;opacity:0.8;margin:2px 0 0;">OM/MOMO</p>' +
            '      </button>' +
            '    </div>' +
            '  </div>' +
            '  <div style="padding:1rem;background:#fff;border-top:1px solid #f1f5f9;">' +
            '    <button onclick="submitOrder()" style="width:100%;padding:1rem;border-radius:1rem;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;font-size:13px;display:flex;align-items:center;justify-content:center;gap:0.5rem;border:none;cursor:pointer;">' +
            '      Confirmer sur WhatsApp' +
            '    </button>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(modal);
    }
    safe('injection modal checkout', injectCheckoutModalIfMissing);

    // ------------------------------------------------------------------------
    // 4. Etat + logique du checkout (definie meme si l'injection du modal a echoue)
    // ------------------------------------------------------------------------
    safe('definition fonctions checkout', function () {
        window.checkoutDelivery = window.checkoutDelivery || 'retrait';
        window.checkoutPayment = window.checkoutPayment || 'especes';
        window.checkoutReferralDiscount = window.checkoutReferralDiscount || 0;

        window.openCheckout = function () {
            var cart = getCart();
            if (cart.length === 0) { alert('Votre panier est vide.'); return; }

            if (!document.getElementById('checkout-modal')) {
                safe('re-injection modal checkout (a la volee)', injectCheckoutModalIfMissing);
            }

            var drawer = document.getElementById('cart-drawer');
            if (drawer && drawer.classList.contains('open') && typeof window.toggleCart === 'function') window.toggleCart();

            renderCheckoutItems();
            var modal = document.getElementById('checkout-modal');
            if (modal) modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        window.closeCheckout = function () {
            var modal = document.getElementById('checkout-modal');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
        };

        function renderCheckoutItems() {
            var cart = getCart();
            var container = document.getElementById('checkout-items');
            if (container) {
                container.innerHTML = cart.map(function (item) {
                    var price = parseInt(item.price || item.prix || 0);
                    var qty = parseInt(item.quantity || 1);
                    var name = item.name || item.nom || 'Produit';
                    return '<div style="display:flex;justify-content:space-between;"><span>' + qty + 'x ' + name + '</span><span style="font-weight:700;">' + (price * qty).toLocaleString() + ' FCFA</span></div>';
                }).join('');
            }
            updateCheckoutTotal();
        }

        function updateCheckoutTotal() {
            var subtotal = getCartSubtotal();
            var deliveryFee = window.checkoutDelivery === 'domicile' ? 2000 : 0;
            var discount = window.checkoutReferralDiscount || 0;
            var total = Math.max(subtotal + deliveryFee - discount, 0);
            var totalEl = document.getElementById('checkout-total');
            if (totalEl) totalEl.textContent = total.toLocaleString() + ' FCFA';
        }

        window.setCheckoutDelivery = function (mode) {
            window.checkoutDelivery = mode;
            var retraitBtn = document.getElementById('btn-checkout-retrait');
            var domicileBtn = document.getElementById('btn-checkout-domicile');
            [retraitBtn, domicileBtn].forEach(function (b) { if (b) b.classList.remove('yarid-selected'); });
            var active = mode === 'retrait' ? retraitBtn : domicileBtn;
            if (active) active.classList.add('yarid-selected');
            updateCheckoutTotal();
        };

        window.setCheckoutPayment = function (mode) {
            window.checkoutPayment = mode;
            var especesBtn = document.getElementById('btn-checkout-especes');
            var mobileBtn = document.getElementById('btn-checkout-mobile');
            [especesBtn, mobileBtn].forEach(function (b) { if (b) b.classList.remove('yarid-selected'); });
            var active = mode === 'especes' ? especesBtn : mobileBtn;
            if (active) active.classList.add('yarid-selected');
        };

        window.applyPromo = function () {
            var input = document.getElementById('promo-input');
            var code = input ? input.value.trim().toUpperCase() : '';
            if (!code) return;
            alert('Code promo non reconnu pour le moment.');
        };

        window.applyReferralCodeAtCheckout = async function () {
            var codeInput = document.getElementById('checkout-referral-code');
            var code = codeInput ? codeInput.value.trim().toUpperCase() : '';
            var statusEl = document.getElementById('referral-code-status');
            if (!code) {
                if (statusEl) { statusEl.textContent = 'Veuillez entrer un code'; statusEl.style.color = '#ef4444'; }
                return;
            }
            var parrain = null;
            if (window.referralSystem && window.referralSystem.getParrainByCode) {
                try { parrain = await window.referralSystem.getParrainByCode(code); } catch (e) { parrain = null; }
            }
            if (parrain) {
                window.checkoutReferralDiscount = Math.min(getCartSubtotal() * 0.1, 5000);
                var row = document.getElementById('referral-discount-row');
                if (row) row.style.display = 'flex';
                if (statusEl) { statusEl.textContent = 'Code valide ! -10% de reduction appliquee'; statusEl.style.color = '#10b981'; }
            } else {
                window.checkoutReferralDiscount = 0;
                var row2 = document.getElementById('referral-discount-row');
                if (row2) row2.style.display = 'none';
                if (statusEl) { statusEl.textContent = 'Code invalide'; statusEl.style.color = '#ef4444'; }
            }
            updateCheckoutTotal();
        };

        function buildOrderMessage() {
            var cart = getCart();
            if (cart.length === 0) return null;
            var msg = 'Bonjour YARID ! Je souhaite passer la commande suivante :\n\n';
            cart.forEach(function (item) {
                var price = parseInt(item.price || item.prix || 0);
                var qty = parseInt(item.quantity || 1);
                var name = item.name || item.nom || 'Produit';
                msg += '\u2022 ' + name + ' x' + qty + ' \u2014 ' + (price * qty).toLocaleString() + ' FCFA\n';
            });
            var subtotal = getCartSubtotal();
            var deliveryFee = window.checkoutDelivery === 'domicile' ? 2000 : 0;
            var discount = window.checkoutReferralDiscount || 0;
            var total = Math.max(subtotal + deliveryFee - discount, 0);
            msg += '\nSous-total : ' + subtotal.toLocaleString() + ' FCFA\n';
            if (deliveryFee > 0) msg += 'Livraison : ' + deliveryFee.toLocaleString() + ' FCFA\n';
            if (discount > 0) msg += 'Reduction : -' + discount.toLocaleString() + ' FCFA\n';
            msg += 'Total : ' + total.toLocaleString() + ' FCFA\n';

            var nomEl = document.getElementById('checkout-nom');
            var telEl = document.getElementById('checkout-tel');
            var adresseEl = document.getElementById('checkout-adresse');
            var nom = nomEl ? nomEl.value.trim() : '';
            var tel = telEl ? telEl.value.trim() : '';
            var adresse = adresseEl ? adresseEl.value.trim() : '';

            msg += '\nNom : ' + (nom || 'Non precise') + '\n';
            msg += 'Telephone : ' + (tel || 'Non precise') + '\n';
            msg += 'Adresse : ' + (adresse || 'Non precise') + '\n';
            msg += 'Livraison : ' + (window.checkoutDelivery === 'domicile' ? 'A domicile' : 'Retrait') + '\n';
            msg += 'Paiement : ' + (window.checkoutPayment === 'mobile' ? 'Mobile Money' : 'Especes a la livraison') + '\n';
            msg += '\nMerci de confirmer ma commande !';
            return msg;
        }

        window.submitOrder = function () {
            var cart = getCart();
            if (cart.length === 0) { alert('Votre panier est vide.'); return; }

            var nomEl = document.getElementById('checkout-nom');
            var telEl = document.getElementById('checkout-tel');
            var adresseEl = document.getElementById('checkout-adresse');
            var nom = nomEl ? nomEl.value.trim() : '';
            var tel = telEl ? telEl.value.trim() : '';
            var adresse = adresseEl ? adresseEl.value.trim() : '';

            if (!nom || !tel || !adresse) {
                alert('Veuillez renseigner votre nom, telephone et adresse.');
                return;
            }

            var msg = buildOrderMessage();
            if (!msg) return;
            window.location.href = 'https://api.whatsapp.com/send?phone=' + WHATSAPP_NUMBER + '&text=' + encodeURIComponent(msg);
        };
    });

    // ------------------------------------------------------------------------
    // 5. Harmonisation des points d'entree de commande
    // ------------------------------------------------------------------------
    safe('harmonisation orderViaWhatsApp / orderWhatsApp / buyNow', function () {
        window.orderViaWhatsApp = function () {
            window.openCheckout();
        };

        window.orderWhatsApp = function () {
            if (typeof currentProduct === 'undefined' || !currentProduct) return;
            if (currentProduct.statut_stock === 'rupture') return;

            var priceEl = document.getElementById('p-price');
            var priceText = priceEl ? priceEl.textContent : '';
            var price = parseInt(priceText.replace(/\D/g, '')) || currentProduct.price || 0;

            var options = [];
            if (typeof selectedVariant !== 'undefined' && selectedVariant) options.push(selectedVariant.nom || selectedVariant.name);
            if (typeof selectedColor !== 'undefined' && selectedColor) options.push(selectedColor);
            if (typeof selectedSize !== 'undefined' && selectedSize) options.push(selectedSize);
            var fullName = options.length > 0 ? (currentProduct.name + ' (' + options.join(', ') + ')') : currentProduct.name;

            silentAddToCart({ id: currentProduct.id, name: fullName, price: price, image_url: currentProduct.image_url }, 1);
            window.openCheckout();
        };

        window.buyNow = function () {
            if (typeof currentModalProduct === 'undefined' || !currentModalProduct) return;
            var qty = typeof modalQty !== 'undefined' ? modalQty : 1;
            silentAddToCart({ id: currentModalProduct.id, name: currentModalProduct.name, price: currentModalProduct.price, image_url: currentModalProduct.image_url }, qty);
            window.openCheckout();
        };
    });

    console.log('[YARID] yarid-checkout.js v2 charge avec succes.');
})();
window.orderCartViaWhatsApp = function () {
    submitOrder();
};

