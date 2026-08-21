// cockpit/lib/telemetry.js
// Best-effort append-only telemetry to Supabase usage_events.
// A failure must NEVER break the app — all errors swallowed.
(function(){
  async function track(eventType, payload){
    try {
      if (!window.SUPABASE_URL || !window.sb) return;
      const base = payload || {};
      // `viewport` est estampille ICI et nulle part ailleurs : un point
      // d'instrumentation unique, donc aucun event ne peut y echapper. Meme
      // raison que le wrapper mdtTrack() de panel-mediatheque.jsx.
      //
      // L'etalement place `viewport` EN PREMIER : un appelant qui fournit
      // deja le champ garde sa valeur. On ne l'ecrase jamais.
      const vp = (window.mobileView && typeof window.innerWidth === "number")
        ? window.mobileView.viewportKind(window.innerWidth)
        : null;
      await window.sb.postJSON(window.SUPABASE_URL + "/rest/v1/usage_events", {
        event_type: eventType,
        payload: vp ? { viewport: vp, ...base } : base,
      });
    } catch (e) {
      console.warn("[track]", eventType, e.message);
    }
  }
  window.track = track;
})();
