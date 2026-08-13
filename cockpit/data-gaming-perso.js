// ═══════════════════════════════════════════════════════════════
// GAMING_PERSO_DATA — Steam + Riot (TFT)
// ─────────────────────────────────────────────
// Shell minimal (même modèle que PROFILE_DATA dans data-profile.js) :
// tout le contenu vient de transformGaming() (cockpit/lib/data-loader.js),
// calculé depuis les tables Steam + TFT à chaque ouverture de l'onglet.
// Ces clés ne sont que le repli avant hydratation, ou si le snapshot
// Steam est vide (utilisateur console-only).
// ═══════════════════════════════════════════════════════════════

window.GAMING_PERSO_DATA = {
  profiles: [],
  totals: {},
  in_progress: [],
  daily_sessions: [],
  genres_30d: [],
  recent_achievements: [],
  milestones: [],
};
