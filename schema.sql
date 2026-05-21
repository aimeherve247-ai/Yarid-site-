-- ============================================================
-- YARID LOGISTICS - Schéma de Base de Données
-- Module Ecosystème Logistique Complet
-- ============================================================

-- 1. ACTIVATION DES EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. SUPPRESSION DES EXISTANTS (pour recréation propre)
DROP TABLE IF EXISTS tracking_livreurs CASCADE;
DROP TABLE IF EXISTS notifications_push CASCADE;
DROP TABLE IF EXISTS commande_items CASCADE;
DROP TABLE IF EXISTS commandes CASCADE;
DROP TABLE IF EXISTS livreurs CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_facture_number() CASCADE;

-- 3. CREATION DES TABLES (dans l'ordre des dépendances)

-- ============================================================
-- TABLE : livreurs (créée en PREMIER car référencée par commandes)
-- ============================================================
CREATE TABLE livreurs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100),
    phone           VARCHAR(20) NOT NULL UNIQUE,
    email           VARCHAR(150),
    photo_url       VARCHAR(500),
    vehicule_type   VARCHAR(30) CHECK (vehicule_type IN ('moto', 'voiture', 'camionnette', 'velo')),
    vehicule_plaque VARCHAR(20),
    vehicule_couleur VARCHAR(30),
    statut          VARCHAR(20) NOT NULL DEFAULT 'offline'
                    CHECK (statut IN ('online', 'offline', 'en_course', 'pause')),
    last_location   GEOGRAPHY(POINT, 4326),
    last_lat        DOUBLE PRECISION,
    last_lng        DOUBLE PRECISION,
    last_location_at TIMESTAMP WITH TIME ZONE,
    total_courses   INTEGER DEFAULT 0,
    note_moyenne    DECIMAL(2,1) DEFAULT 5.0,
    pin_code        VARCHAR(10),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : commandes (créée en DEUXIEME car référence livreurs)
-- ============================================================
CREATE TABLE commandes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            VARCHAR(50) UNIQUE NOT NULL,
    client_nom          VARCHAR(150) NOT NULL,
    client_phone        VARCHAR(20),
    client_email        VARCHAR(150),
    client_adresse      TEXT,
    client_ville        VARCHAR(50) DEFAULT 'Yaounde',
    sous_total          INTEGER NOT NULL DEFAULT 0,
    frais_livraison     INTEGER NOT NULL DEFAULT 0,
    remise              INTEGER NOT NULL DEFAULT 0,
    montant_total       INTEGER NOT NULL DEFAULT 0,
    statut              VARCHAR(30) NOT NULL DEFAULT 'en_attente'
                        CHECK (statut IN ('en_attente', 'paye', 'en_preparation', 'en_livraison', 'livre', 'annule')),
    mode_paiement       VARCHAR(30) NOT NULL DEFAULT 'livraison'
                        CHECK (mode_paiement IN ('livraison', 'mobile_money', 'carte', 'wallet')),
    statut_paiement     VARCHAR(30) NOT NULL DEFAULT 'en_attente'
                        CHECK (statut_paiement IN ('en_attente', 'paye_marchand', 'a_regler_livraison', 'refuse', 'rembourse')),
    livreur_id          UUID REFERENCES livreurs(id) ON DELETE SET NULL,
    livraison_eta       TIMESTAMP WITH TIME ZONE,
    livraison_date      TIMESTAMP WITH TIME ZONE,
    numero_facture      VARCHAR(50) UNIQUE,
    date_facturation    TIMESTAMP WITH TIME ZONE,
    qr_validation       VARCHAR(255),
    notes               TEXT,
    source              VARCHAR(20) DEFAULT 'web',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : commande_items (dépend de commandes)
-- ============================================================
CREATE TABLE commande_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commande_id     UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
    produit_nom     VARCHAR(200) NOT NULL,
    produit_image   VARCHAR(500),
    quantite        INTEGER NOT NULL DEFAULT 1,
    prix_unitaire   INTEGER NOT NULL,
    total_ligne     INTEGER NOT NULL,
    option_taille   VARCHAR(20),
    option_couleur  VARCHAR(30),
    option_autre    VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : tracking_livreurs (dépend de livreurs et commandes)
-- ============================================================
CREATE TABLE tracking_livreurs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    livreur_id  UUID NOT NULL REFERENCES livreurs(id) ON DELETE CASCADE,
    commande_id UUID REFERENCES commandes(id) ON DELETE SET NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    location    GEOGRAPHY(POINT, 4326) NOT NULL,
    vitesse     DOUBLE PRECISION,
    precision_m DOUBLE PRECISION,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : notifications_push (dépend de commandes)
-- ============================================================
CREATE TABLE notifications_push (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commande_id     UUID REFERENCES commandes(id) ON DELETE CASCADE,
    client_phone    VARCHAR(20),
    type            VARCHAR(30) NOT NULL
                    CHECK (type IN ('statut_change', 'livreur_assigne', 'en_cours', 'livre', 'paiement_recu', 'rappel', 'promo')),
    titre           VARCHAR(150) NOT NULL,
    message         TEXT NOT NULL,
    canal           VARCHAR(20) DEFAULT 'push'
                    CHECK (canal IN ('push', 'sms', 'whatsapp', 'email')),
    statut_envoi    VARCHAR(20) DEFAULT 'en_attente'
                    CHECK (statut_envoi IN ('en_attente', 'envoye', 'delivre', 'echoue')),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    envoye_at       TIMESTAMP WITH TIME ZONE
);

-- 4. INDEXES (pour les performances)
CREATE INDEX idx_commandes_order_id ON commandes(order_id);
CREATE INDEX idx_commandes_statut ON commandes(statut);
CREATE INDEX idx_commandes_client_phone ON commandes(client_phone);
CREATE INDEX idx_commandes_livreur ON commandes(livreur_id);
CREATE INDEX idx_commandes_created ON commandes(created_at DESC);
CREATE INDEX idx_commande_items_commande ON commande_items(commande_id);
CREATE INDEX idx_livreurs_statut ON livreurs(statut);
CREATE INDEX idx_livreurs_location ON livreurs USING GIST(last_location) WHERE last_location IS NOT NULL;
CREATE INDEX idx_tracking_livreur ON tracking_livreurs(livreur_id, created_at DESC);
CREATE INDEX idx_tracking_commande ON tracking_livreurs(commande_id);
CREATE INDEX idx_tracking_location ON tracking_livreurs USING GIST(location);
CREATE INDEX idx_tracking_created ON tracking_livreurs(created_at DESC);
CREATE INDEX idx_notifications_commande ON notifications_push(commande_id);
CREATE INDEX idx_notifications_type ON notifications_push(type);
CREATE INDEX idx_notifications_statut ON notifications_push(statut_envoi);

-- 5. FONCTIONS ET TRIGGERS

-- Fonction: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
CREATE TRIGGER trg_commandes_updated
    BEFORE UPDATE ON commandes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_livreurs_updated
    BEFORE UPDATE ON livreurs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction: auto-génération numéro facture et QR
CREATE OR REPLACE FUNCTION generate_facture_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_facture IS NULL THEN
        NEW.numero_facture := 'FAC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT), 1, 6));
    END IF;
    IF NEW.qr_validation IS NULL THEN
        NEW.qr_validation := uuid_generate_v4()::TEXT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_facture
    BEFORE INSERT ON commandes
    FOR EACH ROW EXECUTE FUNCTION generate_facture_number();

-- 6. RLS (Row Level Security)
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE livreurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_livreurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_push ENABLE ROW LEVEL SECURITY;

-- Politiques: accès public (pas besoin d'auth pour les modules logistiques)
CREATE POLICY commandes_public_select ON commandes FOR SELECT USING (true);
CREATE POLICY commandes_public_insert ON commandes FOR INSERT WITH CHECK (true);
CREATE POLICY commandes_public_update ON commandes FOR UPDATE USING (true);
CREATE POLICY items_public_all ON commande_items FOR ALL USING (true);
CREATE POLICY livreurs_public_select ON livreurs FOR SELECT USING (true);
CREATE POLICY livreurs_public_update ON livreurs FOR UPDATE USING (true);
CREATE POLICY tracking_public_select ON tracking_livreurs FOR SELECT USING (true);
CREATE POLICY tracking_public_insert ON tracking_livreurs FOR INSERT WITH CHECK (true);
CREATE POLICY notifications_public_all ON notifications_push FOR ALL USING (true);

-- 7. DONNÉES DE TEST
INSERT INTO livreurs (nom, prenom, phone, vehicule_type, vehicule_plaque, statut, total_courses, note_moyenne, pin_code)
VALUES 
    ('Kouam', 'Jean', '237655959284', 'moto', 'CE-1234-YA', 'online', 142, 4.8, '1234'),
    ('Ngapna', 'Marie', '237677889900', 'voiture', 'LT-5678-DL', 'offline', 89, 4.9, '5678')
ON CONFLICT DO NOTHING;

-- 8. REALTIME (doit être exécuté en dernier après la création des tables)
-- NOTE: Exécutez ces commandes séparément si la publication n'existe pas encore:
-- ALTER PUBLICATION supabase_realtime ADD TABLE tracking_livreurs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE commandes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE livreurs;
