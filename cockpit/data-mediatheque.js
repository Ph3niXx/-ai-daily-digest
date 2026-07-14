// Médiathèque — bibliothèque anime perso : vide au démarrage.
// loadPanel("mediatheque") remplit depuis Supabase (media_franchises,
// media_entries, media_progress, media_releases — lignes brutes).
// Le panel calcule les statuts dérivés à partir de entries + progress.
window.MEDIATHEQUE_DATA = {
  franchises: [],
  entries: [],
  progress: [],
  releases: [],
};
