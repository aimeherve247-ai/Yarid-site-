/**
 * YARID Referral System avec Validation WhatsApp OTP
 * Système de parrainage complet avec validation par code
 */

// Configuration Supabase
const REFERRAL_SUPABASE_URL = 'https://whcpugnkldbmuqzgqxbe.supabase.co';
const REFERRAL_SUPABASE_KEY = 'sb_publishable_LbTOPS3OgBPIJHJGEFKg9Q_djLjGvdk';
const referralClient = supabase.createClient(REFERRAL_SUPABASE_URL, REFERRAL_SUPABASE_KEY);

// État global
let currentOTP = null;
let pendingPhone = null;
let otpTimeout = null;
let resendTimer = null;

/**
 * Génère un code parrain unique
 */
function generateReferralCode() {
  const prefix = 'YRD';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

/**
 * Génère un OTP à 6 chiffres
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Valide le format du numéro de téléphone camerounais
 * Formats acceptés: +237 6XX XXX XXX, 6XX XXX XXX, 2376XXXXXXXX
 */
function validatePhoneNumber(phone) {
  // Nettoyer le numéro
  const cleaned = phone.replace(/\s/g, '').replace(/-/g, '');
  
  // Regex pour les numéros camerounais
  const cameroonRegex = /^(\+237|237)?(6[5-9]\d{7}|2[2-9]\d{7})$/;
  
  if (!cameroonRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'Format invalide. Utilisez: +237 6XX XXX XXX ou 6XX XXX XXX'
    };
  }
  
  // Formater en international
  let formatted = cleaned;
  if (cleaned.startsWith('237') && cleaned.length === 12) {
    formatted = '+' + cleaned;
  } else if (cleaned.length === 9) {
    formatted = '+237' + cleaned;
  }
  
  return {
    valid: true,
    formatted: formatted,
    local: formatted.replace('+237', '')
  };
}

/**
 * Envoie le code OTP via WhatsApp (simulation pour le dev)
 * En production, intégrer avec l'API WhatsApp Business
 */
async function sendOTPWhatsApp(phone, otp) {
  console.log(`[OTP] Code ${otp} envoyé à ${phone}`);
  
  // Simuler l'envoi WhatsApp
  // En production, remplacer par un appel API réel
  const whatsappMessage = `*YARID - Code de vérification*\n\nVotre code de validation est: *${otp}*\n\nCe code expire dans 10 minutes.\nNe le partagez avec personne.`;
  
  // Ouvrir WhatsApp avec le message pré-rempli (mode dev)
  const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(whatsappMessage)}`;
  
  return {
    success: true,
    message: 'Code envoyé avec succès',
    devUrl: whatsappUrl
  };
}

/**
 * Connexion simplifiee pour parrains existants (Modification #4)
 */
async function loginParrain(phone) {
  const validation = validatePhoneNumber(phone);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const formattedPhone = validation.formatted;

  try {
    const { data: existing, error } = await referralClient
      .from('parrainage')
      .select('*')
      .eq('telephone_parrain', formattedPhone)
      .single();

    if (error || !existing) {
      return { success: false, error: 'Aucun compte trouve avec ce numero. Veuillez vous inscrire.' };
    }

    // Validation automatique: s'assurer que le compte est actif (Modification #5)
    if (!existing.is_active) {
      await referralClient
        .from('parrainage')
        .update({ is_active: true, date_activation: new Date().toISOString() })
        .eq('id', existing.id);
    }

    // Connecter dans la session locale
    localStorage.setItem('yarid_user_phone', formattedPhone);
    localStorage.setItem('yarid_referral_code', existing.code_ref);

    return {
      success: true,
      code: existing.code_ref,
      message: 'Connexion reussie ! Votre code: ' + existing.code_ref,
      parrain: existing
    };

  } catch (e) {
    console.error('[Referral] Erreur connexion:', e);
    return { success: false, error: 'Erreur lors de la connexion' };
  }
}

/**
 * Demande la creation d'un compte parrain
 * Modification #5: validation automatique
 */
async function requestParrainAccount(phone) {
  // Valider le numero
  const validation = validatePhoneNumber(phone);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  pendingPhone = validation.formatted;

  // Verifier si le numero existe deja -> connexion auto (Modification #4)
  try {
    const { data: existing } = await referralClient
      .from('parrainage')
      .select('*')
      .eq('telephone_parrain', pendingPhone)
      .single();

    if (existing) {
      // Connexion automatique
      localStorage.setItem('yarid_user_phone', pendingPhone);
      localStorage.setItem('yarid_referral_code', existing.code_ref);

      // S'assurer que le compte est actif (Modification #5)
      if (!existing.is_active) {
        await referralClient
          .from('parrainage')
          .update({ is_active: true, date_activation: new Date().toISOString() })
          .eq('id', existing.id);
      }

      return {
        success: true,
        alreadyRegistered: true,
        code: existing.code_ref,
        message: 'Vous etes deja inscrit ! Connexion automatique...',
        parrain: existing
      };
    }
  } catch (e) {
    // Numero n'existe pas -> continuer l'inscription
  }
  
  // Générer et envoyer l'OTP
  currentOTP = generateOTP();
  
  // Envoyer via WhatsApp
  const sendResult = await sendOTPWhatsApp(pendingPhone, currentOTP);
  
  // Démarrer le timer de renvoi (30 secondes)
  startResendTimer();
  
  // Expiration de l'OTP après 10 minutes
  if (otpTimeout) clearTimeout(otpTimeout);
  otpTimeout = setTimeout(() => {
    currentOTP = null;
    pendingPhone = null;
  }, 10 * 60 * 1000);
  
  return {
    success: true,
    message: 'Code envoyé',
    devOtp: currentOTP // Pour le développement uniquement
  };
}

/**
 * Démarre le timer pour le bouton de renvoi
 */
function startResendTimer() {
  let seconds = 30;
  
  // Mettre à jour l'UI si l'élément existe
  const resendBtn = document.getElementById('resend-otp-btn');
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.textContent = `Renvoyer (${seconds}s)`;
  }
  
  if (resendTimer) clearInterval(resendTimer);
  
  resendTimer = setInterval(() => {
    seconds--;
    
    if (resendBtn) {
      resendBtn.textContent = `Renvoyer (${seconds}s)`;
    }
    
    if (seconds <= 0) {
      clearInterval(resendTimer);
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Renvoyer le code';
      }
    }
  }, 1000);
}

/**
 * Vérifie l'OTP et crée le compte parrain
 */
async function verifyOTPAndCreateAccount(otp) {
  if (!currentOTP || !pendingPhone) {
    return { success: false, error: 'Session expirée. Veuillez recommencer.' };
  }
  
  if (otp !== currentOTP) {
    return { success: false, error: 'Code incorrect. Veuillez réessayer.' };
  }
  
  // Générer le code de parrainage unique
  let codeRef = generateReferralCode();
  let isUnique = false;
  let attempts = 0;
  
  // S'assurer que le code est unique
  while (!isUnique && attempts < 10) {
    const { data } = await referralClient
      .from('parrainage')
      .select('code_ref')
      .eq('code_ref', codeRef)
      .single();
    
    if (!data) {
      isUnique = true;
    } else {
      codeRef = generateReferralCode();
      attempts++;
    }
  }
  
  // Créer le compte parrain
  try {
    const { data: newParrain, error } = await referralClient
      .from('parrainage')
      .insert([{
        telephone_parrain: pendingPhone,
        code_ref: codeRef,
        wallet_solde: 0,
        filleuls: 0,
        filleuls_actifs: 0,
        gains_totaux: 0,
        gains_mois: 0,
        visites: 1,
        is_active: true,
        date_activation: new Date().toISOString(),
        date_inscription: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Sauvegarder dans localStorage
    localStorage.setItem('yarid_user_phone', pendingPhone);
    localStorage.setItem('yarid_referral_code', codeRef);
    
    // Tracker l'événement
    if (window.trackReferralActivation) {
      trackReferralActivation(pendingPhone, true);
    }
    
    // Réinitialiser
    currentOTP = null;
    pendingPhone = null;
    if (otpTimeout) clearTimeout(otpTimeout);
    if (resendTimer) clearInterval(resendTimer);
    
    return {
      success: true,
      code: codeRef,
      message: 'Compte parrain créé avec succès!'
    };
    
  } catch (error) {
    console.error('[Referral] Erreur création compte:', error);
    return { success: false, error: 'Erreur lors de la création du compte' };
  }
}

/**
 * Récupère un parrain par son code
 */
async function getParrainByCode(code) {
  try {
    const { data, error } = await referralClient
      .from('parrainage')
      .select('*')
      .eq('code_ref', code.toUpperCase())
      .single();
    
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Enregistre un filleul (quand quelqu'un utilise un code de parrainage)
 */
async function registerReferee(code, filleulPhone) {
  const parrain = await getParrainByCode(code);
  if (!parrain) return { success: false, error: 'Code invalide' };
  
  try {
    // Vérifier si ce filleul existe déjà
    const { data: existing } = await referralClient
      .from('filleuls')
      .select('*')
      .eq('telephone_filleul', filleulPhone)
      .single();
    
    if (existing) {
      return { success: false, error: 'Vous avez déjà utilisé un code de parrainage' };
    }
    
    // Enregistrer le filleul
    await referralClient.from('filleuls').insert([{
      parrain_id: parrain.id,
      telephone_filleul: filleulPhone,
      date_inscription: new Date().toISOString(),
      actif: false
    }]);
    
    // Mettre à jour le compteur de filleuls
    await referralClient
      .from('parrainage')
      .update({ filleuls: parrain.filleuls + 1 })
      .eq('id', parrain.id);
    
    return { success: true, message: 'Code appliqué avec succès' };
    
  } catch (error) {
    console.error('[Referral] Erreur enregistrement filleul:', error);
    return { success: false, error: 'Erreur lors de l\'enregistrement' };
  }
}

/**
 * Crédite le wallet du parrain après un achat
 */
async function creditParrainWallet(parrainId, amount, description) {
  try {
    // Récupérer le parrain
    const { data: parrain } = await referralClient
      .from('parrainage')
      .select('*')
      .eq('id', parrainId)
      .single();
    
    if (!parrain) return { success: false, error: 'Parrain non trouvé' };
    
    // Vérifier le plafond mensuel (50 000 FCFA)
    if (parrain.gains_mois + amount > 50000) {
      amount = 50000 - parrain.gains_mois;
    }
    
    if (amount <= 0) {
      return { success: false, error: 'Plafond mensuel atteint' };
    }
    
    // Mettre à jour le wallet
    const { error: updateError } = await referralClient
      .from('parrainage')
      .update({
        wallet_solde: parrain.wallet_solde + amount,
        gains_totaux: parrain.gains_totaux + amount,
        gains_mois: parrain.gains_mois + amount
      })
      .eq('id', parrainId);
    
    if (updateError) throw updateError;
    
    // Ajouter à l'historique
    await referralClient.from('wallet_history').insert([{
      parrain_id: parrainId,
      type: 'credit',
      amount: amount,
      description: description,
      created_at: new Date().toISOString()
    }]);
    
    return { success: true, message: `+${amount} FCFA crédités` };
    
  } catch (error) {
    console.error('[Referral] Erreur crédit wallet:', error);
    return { success: false, error: 'Erreur lors du crédit' };
  }
}

/**
 * Partage le code de parrainage
 */
function shareReferralCode() {
  const code = localStorage.getItem('yarid_referral_code');
  if (!code) {
    alert('Vous devez d\'abord activer votre compte parrain');
    return;
  }
  
  const link = window.location.origin + '/index.html?ref=' + code;
  const message = `🎁 Découvre YARID, la boutique premium au Cameroun !\n\nUtilise mon code de parrainage *${code}* et profite de *-10%* sur ta première commande.\n\n${link}\n\n#YARID #Parrainage`;
  
  // Partager via WhatsApp
  window.location.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  
  // Tracker
  if (window.trackReferralShare) {
    trackReferralShare(code);
  }
}

/**
 * Renvoie le code OTP
 */
async function resendOTP() {
  if (!pendingPhone) {
    return { success: false, error: 'Aucune session active' };
  }
  
  // Générer un nouveau code
  currentOTP = generateOTP();
  
  // Renvoyer
  const result = await sendOTPWhatsApp(pendingPhone, currentOTP);
  
  // Redémarrer le timer
  startResendTimer();
  
  return result;
}

// Exposer les fonctions globalement
window.referralSystem = {
  requestParrainAccount,
  verifyOTPAndCreateAccount,
  loginParrain,
  getParrainByCode,
  registerReferee,
  creditParrainWallet,
  shareReferralCode,
  resendOTP,
  validatePhoneNumber,
  generateReferralCode
};

// Fonctions individuelles pour compatibilite
window.requestOTP = requestParrainAccount;
window.verifyOTP = verifyOTPAndCreateAccount;
window.loginParrain = loginParrain;
window.resendOTPCode = resendOTP;
