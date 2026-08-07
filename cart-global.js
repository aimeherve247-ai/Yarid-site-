// --- YARID : GESTION GLOBALE DU PANIER ---

// Sauvegarde le panier dans le stockage local
function saveGlobalCart(cart) {
    localStorage.setItem('yarid_cart', JSON.stringify(cart));
window.dispatchEvent(new Event("storage"));
    updateCartUI();
    renderCartItems();
}

// Ajoute un article
function addToCart(item, qty = 1) {
    let currentCart = JSON.parse(localStorage.getItem('yarid_cart')) || [];
    
    // Vérifier si le produit est déjà dans le panier
    const existing = currentCart.find(i => i.id === item.id && i.name === item.name);
    
    if (existing) {
        existing.quantity = (existing.quantity || 1) + qty;
    } else {
        item.quantity = qty;
        currentCart.push(item);
    }
    
    saveGlobalCart(currentCart);
    toggleCart(); 
}

// Ouvre et ferme le tiroir latéral du panier
function toggleCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    
    if (drawer) drawer.classList.toggle('open');
    if (overlay) overlay.style.display = drawer.classList.contains('open') ? 'block' : 'none';
    
    renderCartItems();
}

// Met à jour la pastille rouge
function updateCartUI() {
    let currentCart = JSON.parse(localStorage.getItem('yarid_cart')) || [];
    const countElems = document.querySelectorAll('#cart-count');
    const totalItems = currentCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    countElems.forEach(el => {
        el.textContent = totalItems;
        el.style.display = totalItems > 0 ? 'flex' : 'none';
    });
}

// Supprime un article
window.removeFromCart = function(index) {
    let currentCart = JSON.parse(localStorage.getItem('yarid_cart')) || [];
    currentCart.splice(index, 1);
    saveGlobalCart(currentCart);
};

// Modifie la quantité
function updateQty(index, change) {
    let currentCart = JSON.parse(localStorage.getItem('yarid_cart')) || [];
    if (currentCart[index]) {
        let newQty = (currentCart[index].quantity || 1) + change;
        currentCart[index].quantity = newQty > 0 ? newQty : 1;
        saveGlobalCart(currentCart);
    }
}

// Affichage du panier (Version Unique et Corrigée)
function renderCartItems() {
    let currentCart = JSON.parse(localStorage.getItem('yarid_cart')) || [];
    const container =
    document.getElementById('cart-items') ||
    document.getElementById('cart-drawer-items');
    const totalEl = document.getElementById('cart-total');
    
    if (!container) return;

    if (currentCart.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-500 py-8">Panier vide.</p>';
        if (totalEl) totalEl.textContent = '0 FCFA';
        return;
    }

    let total = 0;
    container.innerHTML = currentCart.map((item, index) => {
        const itemPrice = parseInt(item.price || item.prix || 0);
        const itemQty = parseInt(item.quantity || 1);
        total += (itemPrice * itemQty);
        
        // Logique récupération image sécurisée
        const img = item.image || item.image_url || (item.images && item.images[0]) || 'https://via.placeholder.com/60';
        const name = item.name || item.nom || 'Produit';
        
        return `
            <div class="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-3">
                <img src="${img}" alt="${name}" class="w-16 h-16 object-cover rounded-lg bg-slate-50">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-slate-800 truncate">${name}</p>
                    <p class="text-xs text-sky-600 font-black mt-0.5">${itemPrice.toLocaleString()} FCFA</p>
                    <div class="flex items-center gap-3 mt-2">
                        <div class="flex items-center border border-slate-200 rounded-lg">
                            <button onclick="updateQty(${index}, -1)" class="w-8 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-l-lg font-bold">-</button>
                            <span class="w-8 text-center text-xs font-bold text-slate-800">${itemQty}</span>
                            <button onclick="updateQty(${index}, 1)" class="w-8 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-r-lg font-bold">+</button>
                        </div>
                    </div>
                </div>
                <button onclick="window.removeFromCart(${index})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
        `;
    }).join('');

    if (totalEl) totalEl.textContent = total.toLocaleString() + ' FCFA';
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    renderCartItems();
});
