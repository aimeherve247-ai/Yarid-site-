/**
 * YARID Cart System
 * Gestion du panier avec codes promo et parrainage
 */

// Configuration Supabase
const CART_SUPABASE_URL = 'https://whcpugnkldbmuqzgqxbe.supabase.co';
const CART_SUPABASE_KEY = 'sb_publishable_LbTOPS3OgBPIJHJGEFKg9Q_djLjGvdk';
const cartClient = supabase.createClient(CART_SUPABASE_URL, CART_SUPABASE_KEY);

// État du panier
let cart = JSON.parse(localStorage.getItem('yarid_cart')) || [];
let appliedPromo = null;
let appliedReferral = null;

/**
 * Calcule le total du panier
 */
function calculateCartTotal() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = 0;
    
    // Appliquer la réduction parrainage (10% max 5000 FCFA)
    if (appliedReferral) {
        discount = Math.min(subtotal * 0.1, 5000);
    }
    
    // Appliquer le code promo
    if (appliedPromo) {
        if (appliedPromo.type === 'percentage') {
            discount += subtotal * (appliedPromo.value / 100);
        } else if (appliedPromo.type === 'fixed') {
            discount += appliedPromo.value;
        }
    }
    
    return {
        subtotal,
        discount,
        total: Math.max(0, subtotal - discount)
    };
}

/**
 * Applique un code promo
 */
async function applyPromoCode(code) {
    if (!code) return { success: false, error: 'Veuillez entrer un code' };
    
    try {
        // Vérifier dans la table PROMOTIONS
        const { data: promo, error } = await cartClient
            .from('PROMOTIONS')
            .select('*')
            .eq('code', code.toUpperCase())
            .single();
        
        if (error || !promo) {
            return { success: false, error: 'Code promo invalide' };
        }
        
        // Vérifier les dates
        const today = new Date().toISOString().split('T')[0];
        if (promo.date_debut > today || promo.date_fin < today) {
            return { success: false, error: 'Ce code promo a expiré' };
        }
        
        appliedPromo = {
            code: promo.code,
            type: promo.type,
            value: promo.value,
            title: promo.titre
        };
        
        // Sauvegarder
        localStorage.setItem('yarid_applied_promo', JSON.stringify(appliedPromo));
        
        return { 
            success: true, 
            message: `Code "${promo.titre}" appliqué !`,
            discount: calculateCartTotal().discount
        };
        
    } catch (err) {
        console.error('[Cart] Erreur application promo:', err);
        return { success: false, error: 'Erreur lors de la vérification' };
    }
}

/**
 * Applique un code de parrainage
 */
async function applyReferralCode(code) {
    if (!code) return { success: false, error: 'Veuillez entrer un code' };
    
    try {
        // Vérifier si le code existe
        const { data: parrain, error } = await cartClient
            .from('parrainage')
            .select('*')
            .eq('code_ref', code.toUpperCase())
            .single();
        
        if (error || !parrain) {
            return { success: false, error: 'Code de parrainage invalide' };
        }
        
        // Vérifier que l'utilisateur ne se parraine pas lui-même
        const userPhone = localStorage.getItem('yarid_user_phone');
        if (userPhone === parrain.telephone_parrain) {
            return { success: false, error: 'Vous ne pouvez pas utiliser votre propre code' };
        }
        
        appliedReferral = {
            code: parrain.code_ref,
            parrainId: parrain.id,
            discount: '10%'
        };
        
        // Sauvegarder
        localStorage.setItem('yarid_applied_referral', JSON.stringify(appliedReferral));
        
        return { 
            success: true, 
            message: 'Code parrainage appliqué ! -10% de réduction',
            parrainName: parrain.telephone_parrain
        };
        
    } catch (err) {
        console.error('[Cart] Erreur application parrainage:', err);
        return { success: false, error: 'Erreur lors de la vérification' };
    }
}

/**
 * Retire le code promo
 */
function removePromoCode() {
    appliedPromo = null;
    localStorage.removeItem('yarid_applied_promo');
    return { success: true };
}

/**
 * Retire le code parrainage
 */
function removeReferralCode() {
    appliedReferral = null;
    localStorage.removeItem('yarid_applied_referral');
    return { success: true };
}

/**
 * Génère le message WhatsApp avec le récapitulatif
 */
function generateWhatsAppMessage(orderDetails) {
    const totals = calculateCartTotal();
    
    let message = `*NOUVELLE COMMANDE YARID* 🛒\n\n`;
    message += `*N° Commande :* ${orderDetails.orderId}\n\n`;
    message += `*Client :* ${orderDetails.nom}\n`;
    message += `*Téléphone :* ${orderDetails.tel}\n`;
    message += `*Adresse :* ${orderDetails.adresse || 'Non précisée'}\n`;
    
    if (appliedReferral) {
        message += `*Code Parrainage :* ${appliedReferral.code}\n`;
    }
    if (appliedPromo) {
        message += `*Code Promo :* ${appliedPromo.code} (${appliedPromo.title})\n`;
    }
    
    message += `\n*Articles :*\n`;
    cart.forEach(item => {
        message += `• ${item.quantity}x ${item.name} = ${(item.price * item.quantity).toLocaleString()} FCFA\n`;
    });
    
    message += `\n*Sous-total :* ${totals.subtotal.toLocaleString()} FCFA\n`;
    
    if (totals.discount > 0) {
        message += `*Réduction :* -${totals.discount.toLocaleString()} FCFA\n`;
    }
    
    message += `*TOTAL :* ${totals.total.toLocaleString()} FCFA\n\n`;
    message += `Merci de confirmer ma commande !`;
    
    return encodeURIComponent(message);
}

/**
 * Sauvegarde la commande dans Supabase
 */
async function saveOrder(orderDetails) {
    const totals = calculateCartTotal();
    
    try {
        const { data, error } = await cartClient
            .from('commande')
            .insert([{
                order_id: orderDetails.orderId,
                client_nom: orderDetails.nom,
                client_phone: orderDetails.tel,
                client_adresse: orderDetails.adresse,
                article: cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
                montant_total: totals.total,
                mode_livraison: orderDetails.deliveryMode,
                mode_paiement: orderDetails.paymentMode,
                statut: 'en_attente',
                code_parrainage: appliedReferral?.code || null,
                code_promo: appliedPromo?.code || null,
                reduction_total: totals.discount,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        // Enregistrer le filleul si code parrainage utilisé
        if (appliedReferral && window.referralSystem) {
            await window.referralSystem.registerReferee(appliedReferral.code, orderDetails.tel);
        }
        
        // Vider le panier après commande
        cart = [];
        localStorage.setItem('yarid_cart', JSON.stringify(cart));
        removePromoCode();
        removeReferralCode();
        
        return { success: true, data };
        
    } catch (err) {
        console.error('[Cart] Erreur sauvegarde commande:', err);
        return { success: false, error: 'Erreur lors de la sauvegarde' };
    }
}

/**
 * Charge les codes appliqués au démarrage
 */
function loadAppliedCodes() {
    const savedPromo = localStorage.getItem('yarid_applied_promo');
    const savedReferral = localStorage.getItem('yarid_applied_referral');
    
    if (savedPromo) appliedPromo = JSON.parse(savedPromo);
    if (savedReferral) appliedReferral = JSON.parse(savedReferral);
}

// Initialisation
loadAppliedCodes();

// Exposer les fonctions globalement
window.cartSystem = {
    calculateCartTotal,
    applyPromoCode,
    applyReferralCode,
    removePromoCode,
    removeReferralCode,
    generateWhatsAppMessage,
    saveOrder,
    get cart() { return cart; },
    get appliedPromo() { return appliedPromo; },
    get appliedReferral() { return appliedReferral; }
};
