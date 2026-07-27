// cockpit/lib/boot-mediatheque.js
// Point d'entree de mediatheque.html — l'equivalent de bootstrap.js pour la
// page mobile dediee, ampute de Tier 1.
//
// Ordre : auth → fetch Tier 2 → mount. On ne charge PAS bootTier1() : le panel
// ne lit rien de COCKPIT_DATA, seulement window.MEDIATHEQUE_DATA et la cle
// tmdb_api_key de PROFILE_DATA (panel-mediatheque.jsx:776). Tier 1 couterait
// 11 requetes dont articles/30j et signal_tracking pour rien.
(async function boot(){
  const loader = document.createElement("div");
  loader.id = "mdt-loader";
  loader.style.cssText = "position:fixed;inset:0;z-index:8000;display:flex;align-items:center;"
    + "justify-content:center;background:var(--bg,#F5EFE4);font-family:'Inter',system-ui,sans-serif;"
    + "color:#5E524A;font-size:13px;letter-spacing:.06em;text-transform:uppercase";
  loader.innerHTML = "<div>Chargement de la médiathèque…</div>";
  document.body.appendChild(loader);

  const removeLoader = () => {
    const l = document.getElementById("mdt-loader");
    if (l) l.remove();
  };

  // Recharge les donnees Tier 2 et re-rend. Expose pour l'ecouteur de reprise.
  async function refresh(){
    const dl = window.cockpitDataLoader;
    dl.invalidateCache("media_");
    dl.invalidateCache("jp_");
    dl.invalidateCache("user_profile");
    dl.invalidateCache("activity_brief");
    await loadData();
    if (window.__mdtRoot) window.__mdtRoot.render(React.createElement(window.PanelMediatheque));
  }

  async function loadData(){
    const dl = window.cockpitDataLoader;
    const [, profileRows] = await Promise.all([
      dl.loadPanel("mediatheque").catch((e) => { console.error("[boot-mdt] Tier 2", e); return null; }),
      dl.loadUserProfile().catch(() => []),
    ]);
    // transformProfile() est exportee par data-loader.js — meme fonction que
    // celle utilisee par hydrateGlobalsFromTier1() pour ce champ, source
    // unique (pas de copie a maintenir en phase). On n'appelle pas
    // hydrateGlobalsFromTier1() elle-meme : elle attend un __COCKPIT_RAW
    // complet (radarRows, signals…) construit par bootTier1(), qu'on ne fait
    // pas tourner ici. Le panel ne lit que _values.tmdb_api_key, jamais _raw
    // ni identity (panel-mediatheque.jsx:776).
    if (window.PROFILE_DATA && profileRows && profileRows.length) {
      window.PROFILE_DATA._values = dl.transformProfile(profileRows);
    }
  }

  try {
    if (!window.sb || !window.cockpitAuth || !window.cockpitDataLoader) {
      console.error("[boot-mdt] scripts lib manquants");
      removeLoader();
      return;
    }
    await window.cockpitAuth.waitForAuth();
    await loadData();
  } catch (e) {
    console.error("[boot-mdt]", e);
  }

  // Babel standalone compile les scripts type="text/babel" de facon asynchrone,
  // APRES les scripts classiques : window.PanelMediatheque n'existe pas encore.
  let waited = 0;
  while (!window.PanelMediatheque && waited < 15000) {
    await new Promise((r) => setTimeout(r, 50));
    waited += 50;
  }
  removeLoader();
  if (!window.PanelMediatheque) {
    console.error("[boot-mdt] PanelMediatheque jamais enregistre");
    document.getElementById("root").textContent = "Échec du chargement.";
    return;
  }
  window.__mdtRoot = ReactDOM.createRoot(document.getElementById("root"));
  window.__mdtRoot.render(React.createElement(window.PanelMediatheque));
  window.__mdtRefresh = refresh;
})();
