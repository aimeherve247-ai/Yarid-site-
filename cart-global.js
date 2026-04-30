// ============================================================
// YARID - Module Panier Global
// Partagé par toutes les pages (index.html, category-view.html, services.html)
// Ce fichier contient UNIQUEMENT la logique JS du panier.
// Chaque page garde son propre HTML de drawer panier.
// ============================================================

let cart = JSON.parse(localStorage.getItem('yarid_cart')) || [];
let checkoutDelivery = 'retrait';
let checkoutPayment = 'especes';

function addToCart(product, qty) {
    if (!product || !product.id) return;
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image_url || product.image,
            quantity: qty
        });
    }
    saveCart();
    updateCartUI();

    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.classList.add('scale-125');
        setTimeout(() => badge.classList.remove('scale-125'), 200);
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    renderCartItems();
}

function updateCartQty(index, delta) {
    if (!cart[index]) return;
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    saveCart();
    updateCartUI();
    renderCartItems();
}

function saveCart() {
    localStorage.setItem('yarid_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const elSubtotal = document.getElementById('cart-subtotal');
    const elTotal = document.getElementById('cart-total');
    if (elSubtotal) elSubtotal.textContent = subtotal.toLocaleString() + ' FCFA';
    if (elTotal) elTotal.textContent = subtotal.toLocaleString() + ' FCFA';
}

function toggleCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer || !overlay) return;
    drawer.classList.toggle('open');
    overlay.classList.toggle('active');
    renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10">
                <svg class="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
                <p class="text-slate-400">Votre panier est vide</p>
            </div>
        `;
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <div class="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100">
            <img src="${item.image || 'https://via.placeholder.com/150'}" class="w-16 h-16 object-cover rounded-xl" alt="${item.name}">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-sm truncate">${item.name}</h4>
                <p class="text-sky-600 font-bold text-sm">${(item.price * item.quantity).toLocaleString()} FCFA</p>
            </div>
            <div class="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                <button onclick="updateCartQty(${index}, -1)" class="w-7 h-7 rounded-lg bg-white font-bold text-slate-600">-</button>
                <span class="w-6 text-center font-bold text-sm">${item.quantity}</span>
                <button onclick="updateCartQty(${index}, 1)" class="w-7 h-7 rounded-lg bg-white font-bold text-slate-600">+</button>
            </div>
            <button onclick="removeFromCart(${index})" class="p-2 text-red-400 hover:text-red-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
        </div>
    `).join('');
}

function orderViaWhatsApp() {
    if (cart.length === 0) return alert('Votre panier est vide !');
    const cartSummary = cart.map(i => '• ' + i.quantity + 'x ' + i.name + ' = ' + (i.price * i.quantity).toLocaleString() + ' FCFA').join('\n');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const msg = '*COMMANDE YARID* 🛒\n\n' + cartSummary + '\n\n*TOTAL : ' + total.toLocaleString() + ' FCFA*\n\nMerci de confirmer ma commande !';
    window.location.href = 'https://wa.me/237655959284?text=' + encodeURIComponent(msg);
}

function applyPromo() {
    const code = document.getElementById('promo-input');
    if (!code || !code.value.trim()) return;
    alert('Code promo en cours de vérification...');
}

// ========== CHECKOUT ==========

function openCheckout() {
    if (cart.length === 0) return alert('Votre panier est vide !');
    toggleCart();
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const elTotal = document.getElementById('checkout-total');
    if (elTotal) elTotal.textContent = total.toLocaleString() + ' FCFA';

    const elItems = document.getElementById('checkout-items');
    if (elItems) {
        elItems.innerHTML = cart.map(item => `
            <div class="flex justify-between">
                <span class="text-slate-600">${item.quantity}x ${item.name}</span>
                <span class="font-medium">${(item.price * item.quantity).toLocaleString()} F</span>
            </div>
        `).join('');
    }
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.add('active');
}

function closeCheckout() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.remove('active');
}

function setCheckoutDelivery(mode) {
    checkoutDelivery = mode;
    const btnRetrait = document.getElementById('btn-checkout-retrait');
    const btnDomicile = document.getElementById('btn-checkout-domicile');
    if (btnRetrait) {
        btnRetrait.className = mode === 'retrait'
            ? 'p-4 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white text-center transition-all'
            : 'p-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 text-center transition-all';
    }
    if (btnDomicile) {
        btnDomicile.className = mode === 'domicile'
            ? 'p-4 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white text-center transition-all'
            : 'p-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 text-center transition-all';
    }
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = mode === 'domicile' ? 2000 : 0;
    const elTotal = document.getElementById('checkout-total');
    if (elTotal) elTotal.textContent = (subtotal + deliveryFee).toLocaleString() + ' FCFA';
}

function setCheckoutPayment(mode) {
    checkoutPayment = mode;
    const btnCash = document.getElementById('btn-checkout-especes');
    const btnMobile = document.getElementById('btn-checkout-mobile');
    if (btnCash) {
        btnCash.className = mode === 'especes'
            ? 'p-4 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white text-center transition-all'
            : 'p-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 text-center transition-all';
    }
    if (btnMobile) {
        btnMobile.className = mode === 'mobile'
            ? 'p-4 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white text-center transition-all'
            : 'p-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 text-center transition-all';
    }
}

async function submitOrder() {
    const nomEl = document.getElementById('checkout-nom');
    const telEl = document.getElementById('checkout-tel');
    const adresseEl = document.getElementById('checkout-adresse');
    const referralCodeEl = document.getElementById('checkout-referral-code');

    const nom = nomEl ? nomEl.value.trim() : '';
    const tel = telEl ? telEl.value.trim() : '';
    const adresse = adresseEl ? adresseEl.value.trim() : '';
    const referralCode = referralCodeEl ? referralCodeEl.value.trim().toUpperCase() : '';

    if (!nom || !tel) {
        alert('Veuillez remplir votre nom et téléphone');
        return;
    }

    const btn = document.getElementById('btn-submit-order');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>Envoi...';
    }

    const orderId = 'YRD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = checkoutDelivery === 'domicile' ? 2000 : 0;

    let discountAmount = 0;
    const discountRow = document.getElementById('referral-discount-row');
    if (discountRow && discountRow.style.display !== 'none') {
        discountAmount = Math.min(subtotal * 0.1, 5000);
    }

    const total = subtotal + deliveryFee - discountAmount;
    const cartSummary = cart.map(i => i.quantity + 'x ' + i.name).join(', ');

    try {
        if (typeof _supabase !== 'undefined') {
            await _supabase.from('commande').insert([{
                order_id: orderId,
                client_nom: nom,
                client_phone: tel,
                client_adresse: adresse,
                article: cartSummary,
                montant_total: total,
                mode_livraison: checkoutDelivery,
                mode_paiement: checkoutPayment,
                statut: 'en_attente',
                code_parrainage: referralCode || null,
                reduction_parrainage: discountAmount
            }]);

            if (referralCode && window.referralSystem) {
                await window.referralSystem.registerReferee(referralCode, tel);
            }
        }
    } catch (e) {
        console.error('Erreur sauvegarde commande:', e);
    }

    const msg = '*NOUVELLE COMMANDE YARID* 🛒\n\n' +
        '*N° Commande :* ' + orderId + '\n\n' +
        '*Client :* ' + nom + '\n' +
        '*Téléphone :* ' + tel + '\n' +
        '*Adresse :* ' + (adresse || 'Non précisée') + '\n' +
        (referralCode ? '*Code Parrainage :* ' + referralCode + '\n' : '') +
        (discountAmount > 0 ? '*Réduction :* -' + discountAmount.toLocaleString() + ' FCFA\n' : '') +
        '\n' +
        '*Articles :*\n' + cart.map(i => '• ' + i.quantity + 'x ' + i.name).join('\n') + '\n\n' +
        '*Sous-total :* ' + subtotal.toLocaleString() + ' FCFA\n' +
        '*Livraison :* ' + (checkoutDelivery === 'domicile' ? '2000 FCFA' : 'Gratuit (retrait)') + '\n' +
        '*Mode de paiement :* ' + (checkoutPayment === 'especes' ? 'Espèces' : 'Mobile Money') + '\n' +
        '*TOTAL :* ' + total.toLocaleString() + ' FCFA\n\n' +
        'Merci de confirmer ma commande !';

    cart = [];
    saveCart();
    updateCartUI();

    window.location.href = 'https://wa.me/237655959284?text=' + encodeURIComponent(msg);
}

// ========== SYNC INTER-ONGLETS ==========

window.addEventListener('storage', function(e) {
    if (e.key === 'yarid_cart') {
        cart = JSON.parse(localStorage.getItem('yarid_cart')) || [];
        updateCartUI();
        renderCartItems();
    }
});
