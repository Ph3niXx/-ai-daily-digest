-- Migration 015 — Offres clôturées (masquage du feed Jobs Radar)
--
-- Cowork pose closed_at = now() quand LinkedIn marque une offre
-- « Les candidatures ne sont plus acceptées ». Le cockpit masque les
-- offres closed_at non-null (sauf celles déjà 'applied'). Colonne
-- orthogonale au status. Additif + idempotent.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS closed_at timestamptz;
