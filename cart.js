// État global du panier
let cart = JSON.parse(localStorage.getItem('yarid_cart')) || [];

document.addEventListener('DOMContentLoaded', () => {
    updateUI();
});

function toggleCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer && overlay) {
        drawer.classList.toggle('translate-x-full');
        overlay.classList.toggle('hidden');
        renderCart();
    }
}

function updateUI() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll('#cart-count');
    badges.forEach(b => b.innerText = count);
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('summary-total');
    if (!container) return;

    container.innerHTML = cart.length === 0 ? '<p class="text-center py-10 text-slate-400">Votre panier est vide</p>' : '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        container.innerHTML += `
            <div class="flex items-center justify-between py-4 border-b border-slate-100">
                <div class="flex items-center gap-3">
                    <div class="font-bold text-sm text-slate-900">${item.name}</div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center bg-slate-100 rounded-lg px-2">
                        <button onclick="changeQty(${index}, -1)" class="p-1">-</button>
                        <span class="px-2 text-xs font-bold">${item.quantity}</span>
                        <button onclick="changeQty(${index}, 1)" class="p-1">+</button>
                    </div>
                    <span class="text-xs font-black">${(item.price * item.quantity).toLocaleString()} F</span>
                </div>
            </div>`;
    });
    if (totalEl) totalEl.innerText = total.toLocaleString() + ' FCFA';
}

function changeQty(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    localStorage.setItem('yarid_cart', JSON.stringify(cart));
    updateUI();
    renderCart();
}

async function validerCommande() {
    // Récupération des infos client
    const nom = document.getElementById('client_nom').value;
    const tel = document.getElementById('client_tel').value;
    const adresse = document.getElementById('client_adresse').value;

    if (!nom || !tel || cart.length === 0) return alert("Infos manquantes !");

    const orderId = 'YRD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const cartSummary = cart.map(i => `${i.quantity}x ${i.name}`).join(', ');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Message WhatsApp formaté pour ta facture
    const msg = `*COMMANDE YARID*\nID: ${orderId}\n\nClient: ${nom}\nTel: ${tel}\n\nArticles:\n${cartSummary}\n\nTOTAL: ${total} FCFA`;
    
    // Tentative d'envoi vers Supabase (Attention au nom de la colonne 'article')
    try {
        if(typeof _supabase !== 'undefined') {
            await _supabase.from('commande').insert([{
                order_id: orderId, client_nom: nom, client_telephone: tel,
                article: cartSummary, montant_total: total // 'article' doit exister en DB
            }]);
        }
    } catch(e) {}

    window.location.href = `https://wa.me/237655959284?text=${encodeURIComponent(msg)}`;
}
