-- ============================================================
-- FONCTIONS RPC SUPABASE POUR YARID
-- À exécuter dans l'éditeur SQL de Supabase Dashboard
-- ============================================================

-- 1. Fonction increment_views : incrémente le compteur de vues d'un produit
--    Appelée par produit-detail.html à chaque visite
CREATE OR REPLACE FUNCTION increment_views(pid BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE PRODUITS
    SET vues = COALESCE(vues, 0) + 1
    WHERE id = pid;
END;
$$;

-- 2. Commentaire (optionnel)
COMMENT ON FUNCTION increment_views(BIGINT) IS 'Incremente le compteur de vues d un produit YARID';

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Pour tester :
-- SELECT increment_views(1);
-- SELECT id, name, vues FROM PRODUITS ORDER BY vues DESC LIMIT 5;
