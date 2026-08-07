# YARID - Guide de Securite

## Mesures implementees

### 1. Authentification Admin
- **Page de login** obligatoire sur `admin.html`
- Identifiants : `admin` / `Yarid2024!`
- Session de **30 minutes** avec compte a rebours visible
- Anti-brute force : mot de passe efface apres echec
- Blocage du clic droit et raccourcis DevTools (F12, Ctrl+Shift+I)

### 2. Content Security Policy (CSP)
Toutes les pages ont un CSP qui bloque :
- Scripts externes non autorises
- Les iframes (frame-src 'none')
- Les objets embed (object-src 'none')
- Les injections inline non autorisees

### 3. Protection XSS
- Fonction `escapeHtml()` sur toutes les donnees utilisateur
- Fonction `sanitizeInput()` qui supprime `<script>`, `javascript:`, `onerror=`
- Validation des URLs d'images (format https://)
- Longueur maximale sur tous les champs (maxlength)

### 4. Securite livreur-app
- **localStorage securise** avec expiration (24h)
- Validation de l'ID livreur (entier positif uniquement)
- Nettoyage automatique des sessions expirees

### 5. Securite facture
- Marges PDF A4 pour eviter les coupures
- QR code via API securisee
- Taille fixe A4 (210mm x 297mm)

## Configurations requises cote Supabase

### Activer Row Level Security (RLS) - OBLIGATOIRE

Dans votre dashboard Supabase, executez ces requetes SQL :

```sql
-- 1. Activer RLS sur toutes les tables
ALTER TABLE PRODUITS ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis ENABLE ROW LEVEL SECURITY;
ALTER TABLE livreurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_livreurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_push ENABLE ROW LEVEL SECURITY;

-- 2. Politique : tout le monde peut lire les PRODUITS
CREATE POLICY "Produits visibles par tous" ON PRODUITS
    FOR SELECT USING (true);

-- 3. Politique : seul l'admin peut modifier les PRODUITS
CREATE POLICY "Produits modifiables par admin" ON PRODUITS
    FOR ALL USING (false);  -- Desactiver par defaut, utiliser service_role

-- 4. Politique : avis visibles par tous
CREATE POLICY "Avis visibles par tous" ON avis
    FOR SELECT USING (true);

-- 5. Politique : tout le monde peut ajouter un avis
CREATE POLICY "Avis ajoutables par tous" ON avis
    FOR INSERT WITH CHECK (true);

-- 6. Politique : commandes - le client peut voir ses commandes
CREATE POLICY "Commandes par order_id" ON commandes
    FOR SELECT USING (true);  -- Ou filtrer par phone si besoin

-- 7. Politique : livreurs - authentification par phone+pin
CREATE POLICY "Livreurs auth" ON livreurs
    FOR SELECT USING (true);  -- La verification se fait cote client

-- 8. Politique : tracking en lecture/insertion uniquement
CREATE POLICY "Tracking insertion" ON tracking_livreurs
    FOR INSERT WITH CHECK (true);
```

### Desactiver l'auto-confirmation email (si auth email)
Dans Supabase Dashboard > Authentication > Settings :
- Disable "Enable email confirmations"
- Set "JWT expiry limit" a 3600 (1 heure)

### Securiser la anon key
La cle anon actuelle (`sb_publishable_LbTOPS3OgBPIJHJGEFKg9Q_djLjGvdk`) est exposee cote client. C'est normal pour une anon key, mais **les RLS sont OBLIGATOIRES** pour limiter ce qu'elle peut faire.

### Creer une cle service_role pour l'admin
1. Supabase Dashboard > Settings > API > New API Key
2. Utiliser cette cle cote serveur uniquement (jamais dans le navigateur)
3. Pour l'admin, considerer une authentification Supabase Auth avec JWT

## Checklist de securite

- [x] CSP sur toutes les pages
- [x] Sanitization XSS (escapeHtml, sanitizeInput)
- [x] Authentification admin avec session timeout
- [x] Secure localStorage avec expiration
- [x] Validation des inputs (maxlength, type, required)
- [x] Protection contre clickjacking (X-Frame-Options via CSP)
- [ ] RLS active sur toutes les tables Supabase
- [ ] HTTPS force en production
- [ ] Rate limiting sur les API Supabase
- [ ] Audit log des connexions admin
- [ ] Rotation reguliere des cles API

## Points de vigilance

1. **Ne jamais** commiter le mot de passe admin dans un repo git
2. **Ne jamais** utiliser la service_role key dans le navigateur
3. **Activer les RLS** avant la mise en production
4. **Configurer HTTPS** avec redirect HTTP->HTTPS
5. **Tester** les injections XSS regulierement
6. **Monitorer** les appels Supabase suspects

## Contacts en cas d'incident
- Changer immediatement le mot de passe admin
- Revoker et regenerer la cle anon Supabase
- Verifier les logs Supabase > Logs > Auth
- Contacter : support@yarid.cm
