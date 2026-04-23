/**
 * YARID Analytics System - Marketing Intelligence
 * Tracking interne complet pour le funnel de conversion
 */

// Configuration Supabase
const ANALYTICS_SUPABASE_URL = 'https://whcpugnkldbmuqzgqxbe.supabase.co';
const ANALYTICS_SUPABASE_KEY = 'sb_publishable_LbTOPS3OgBPIJHJGEFKg9Q_djLjGvdk';
const analyticsClient = supabase.createClient(ANALYTICS_SUPABASE_URL, ANALYTICS_SUPABASE_KEY);

// Session management
if (!sessionStorage.getItem('yarid_session_id')) {
    sessionStorage.setItem('yarid_session_id', 'sess_' + Math.random().toString(36).substr(2, 9));
}
const sessionId = sessionStorage.getItem('yarid_session_id');

// UTM Parameters
const urlParams = new URLSearchParams(window.location.search);
const utmSource = urlParams.get('utm_source') || 'direct';
const utmCampaign = urlParams.get('utm_campaign') || null;
const utmMedium = urlParams.get('utm_medium') || null;

// User identification
const activeUser = JSON.parse(localStorage.getItem('yarid_user') || '{}');
const userId = activeUser.username || localStorage.getItem('yarid_user_phone') || null;

// Time tracking
let pageStartTime = Date.now();
let currentPage = window.location.pathname.split('/').pop() || 'index';

/**
 * Détecte le type d'appareil
 */
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        return 'Mobile';
    }
    return 'Desktop';
}

/**
 * Détecte la source de trafic
 */
function getTrafficSource() {
    if (utmSource !== 'direct') return utmSource;
    if (document.referrer) {
        if (document.referrer.includes('facebook.com')) return 'Facebook';
        if (document.referrer.includes('instagram.com')) return 'Instagram';
        if (document.referrer.includes('whatsapp.com')) return 'WhatsApp';
        if (document.referrer.includes('google.')) return 'Google';
        return 'Referral';
    }
    return 'Direct';
}

/**
 * Fonction principale de tracking
 */
async function trackYaridEvent(eventName, eventDetails = {}) {
    const device = getDeviceType();
    const source = getTrafficSource();
    
    // Calculer le temps passé sur la page
    const timeOnPage = Date.now() - pageStartTime;
    
    const payload = {
        event_type: eventName,
        page_url: currentPage,
        device_type: device,
        session_id: sessionId,
        user_id: userId,
        utm_source: source,
        utm_campaign: utmCampaign,
        utm_medium: utmMedium,
        time_on_page_ms: timeOnPage,
        details: eventDetails,
        created_at: new Date().toISOString()
    };

    try {
        await analyticsClient.from('site_analytics').insert([payload]);
        console.log('[Analytics]', eventName, eventDetails);
    } catch (err) {
        console.error('[Analytics Error]', err);
    }
}

/**
 * Tracking des événements produits
 */
function trackProductView(productId, productName, productPrice, category) {
    trackYaridEvent('view_product', {
        product_id: productId,
        product_name: productName,
        product_price: productPrice,
        category: category
    });
}

function trackAddToCart(productId, productName, quantity, price) {
    trackYaridEvent('add_to_cart', {
        product_id: productId,
        product_name: productName,
        quantity: quantity,
        price: price,
        cart_value: quantity * price
    });
}

function trackRemoveFromCart(productId, productName, quantity) {
    trackYaridEvent('remove_from_cart', {
        product_id: productId,
        product_name: productName,
        quantity: quantity
    });
}

function trackPurchaseSuccess(orderId, totalAmount, items, paymentMethod, deliveryMethod) {
    trackYaridEvent('purchase_success', {
        order_id: orderId,
        total_amount: totalAmount,
        items_count: items.length,
        items: items.map(i => ({ id: i.id, name: i.name, qty: i.quantity })),
        payment_method: paymentMethod,
        delivery_method: deliveryMethod
    });
}

/**
 * Tracking du funnel de conversion
 */
function trackFunnelStep(step, details = {}) {
    const funnelSteps = {
        'visit': 1,
        'product_view': 2,
        'cart_add': 3,
        'checkout_start': 4,
        'purchase': 5
    };
    
    trackYaridEvent('funnel_step', {
        step_name: step,
        step_number: funnelSteps[step] || 0,
        ...details
    });
}

/**
 * Tracking des interactions
 */
function trackSearch(query, resultsCount) {
    trackYaridEvent('search', {
        query: query,
        results_count: resultsCount
    });
}

function trackCategoryClick(category) {
    trackYaridEvent('category_click', { category: category });
}

function trackPromoClick(promoTitle) {
    trackYaridEvent('promo_click', { promo_title: promoTitle });
}

function trackReferralShare(code) {
    trackYaridEvent('referral_share', { code: code });
}

function trackReferralActivation(phone, success) {
    trackYaridEvent('referral_activation', {
        phone: phone.replace(/\d(?=\d{4})/g, '*'),
        success: success
    });
}

/**
 * Dashboard Analytics - Récupération des données
 */
async function getAnalyticsDashboard() {
    try {
        // Récupérer les données des dernières 24h
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const { data: recentData, error } = await analyticsClient
            .from('site_analytics')
            .select('*')
            .gte('created_at', yesterday.toISOString());
        
        if (error) throw error;
        
        // Calculer les KPIs
        const totalViews = recentData.filter(d => d.event_type === 'page_view').length;
        const productViews = recentData.filter(d => d.event_type === 'view_product').length;
        const cartAdds = recentData.filter(d => d.event_type === 'add_to_cart').length;
        const purchases = recentData.filter(d => d.event_type === 'purchase_success').length;
        
        // Taux de conversion
        const conversionRate = totalViews > 0 ? ((purchases / totalViews) * 100).toFixed(2) : 0;
        
        // Taux d'abandon panier
        const cartAbandonRate = cartAdds > 0 ? (((cartAdds - purchases) / cartAdds) * 100).toFixed(2) : 0;
        
        // Trafic mobile
        const mobileViews = recentData.filter(d => d.device_type === 'Mobile').length;
        const mobilePercent = totalViews > 0 ? ((mobileViews / totalViews) * 100).toFixed(0) : 0;
        
        // Sources de trafic
        const sources = {};
        recentData.forEach(d => {
            const src = d.utm_source || 'Direct';
            sources[src] = (sources[src] || 0) + 1;
        });
        
        // Alertes
        const alerts = [];
        
        // Produits "très vus mais peu achetés"
        const productEvents = recentData.filter(d => 
            d.event_type === 'view_product' || d.event_type === 'purchase_success'
        );
        const productStats = {};
        productEvents.forEach(e => {
            if (!productStats[e.details?.product_id]) {
                productStats[e.details?.product_id] = { views: 0, purchases: 0, name: e.details?.product_name };
            }
            if (e.event_type === 'view_product') productStats[e.details.product_id].views++;
            if (e.event_type === 'purchase_success') productStats[e.details.product_id].purchases++;
        });
        
        Object.entries(productStats).forEach(([id, stats]) => {
            if (stats.views > 10 && stats.purchases === 0) {
                alerts.push({
                    type: 'warning',
                    message: `"${stats.name}" a ${stats.views} vues mais 0 achats`
                });
            }
        });
        
        // Abandons anormaux au checkout
        const checkouts = recentData.filter(d => d.event_type === 'checkout_start').length;
        if (checkouts > 0 && purchases === 0 && checkouts > 5) {
            alerts.push({
                type: 'critical',
                message: `${checkouts} checkouts démarrés mais 0 achats - Vérifiez le processus`
            });
        }
        
        return {
            totalViews,
            productViews,
            cartAdds,
            purchases,
            conversionRate,
            cartAbandonRate,
            mobilePercent,
            sources,
            alerts,
            funnel: {
                visit: totalViews,
                product: productViews,
                cart: cartAdds,
                checkout: checkouts,
                purchase: purchases
            }
        };
        
    } catch (err) {
        console.error('[Dashboard Error]', err);
        return null;
    }
}

// Tracking automatique au chargement
document.addEventListener('DOMContentLoaded', () => {
    trackYaridEvent('page_view', {
        title: document.title,
        referrer: document.referrer || 'direct'
    });
    trackFunnelStep('visit');
});

// Tracking du temps passé avant de quitter la page
window.addEventListener('beforeunload', () => {
    const timeOnPage = Date.now() - pageStartTime;
    trackYaridEvent('page_exit', { time_spent_ms: timeOnPage });
});

// Exposer les fonctions globalement
window.trackYaridEvent = trackYaridEvent;
window.trackProductView = trackProductView;
window.trackAddToCart = trackAddToCart;
window.trackRemoveFromCart = trackRemoveFromCart;
window.trackPurchaseSuccess = trackPurchaseSuccess;
window.trackFunnelStep = trackFunnelStep;
window.trackSearch = trackSearch;
window.trackCategoryClick = trackCategoryClick;
window.trackPromoClick = trackPromoClick;
window.trackReferralShare = trackReferralShare;
window.trackReferralActivation = trackReferralActivation;
window.getAnalyticsDashboard = getAnalyticsDashboard;
