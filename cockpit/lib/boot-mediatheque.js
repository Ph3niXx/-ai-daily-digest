// cockpit/lib/boot-mediatheque.js
// Point d'entree de mediatheque.html — l'equivalent de bootstrap.js pour la
// page mobile dediee, ampute de Tier 1.
//
// Ordre : auth → fetch Tier 2 → mount. On ne charge PAS bootTier1() : le panel
// ne lit rien de COCKPIT_DATA, seulement window.MEDIATHEQUE_DATA et la cle
// tmdb_api_key de PROFILE_DATA (panel-mediatheque.jsx:776). Tier 1 couterait
// 11 requetes dont articles/30j et signal_tracking pour rien.

// Frontiere d'erreur — sans elle, un throw pendant le rendu demonte toute la
// racine et laisse une page blanche, sans Web Inspector accessible depuis
// Windows pour diagnostiquer (bug deja vecu de cette forme, voir
// panel-mediatheque.jsx:927-929). Calquee sur PanelErrorBoundary (app.jsx:67-96),
// en React.createElement pur : ce script est classique (pas Babel), pas de
// JSX disponible ici.
//
// Cette frontiere DOIT rester stable (jamais recreee) alors que l'element
// qu'elle enveloppe (voir renderPanel() plus bas) change de key a chaque
// refresh(). Si la frontiere elle-meme etait recreee a chaque remount, une
// erreur captee serait effacee au refresh suivant : un panel qui replante de
// facon deterministe (meme bug a chaque montage, exactement le cas
// documente ci-dessus) replanterait puis serait recapture indefiniment au
// fil des refresh, au lieu de rester bloque sur le message. En restant
// stable, l'instance qui capte l'erreur garde son state.err et ne tente
// plus jamais de rendre this.props.children tant que la page n'a pas ete
// rechargee pour de vrai — ce que le bouton ci-dessous declenche.
class MdtErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err){ return { err }; }
  componentDidCatch(err, info){
    console.error("[MdtErrorBoundary]", err, info && info.componentStack);
  }
  render(){
    if (this.state.err) {
      return React.createElement(
        "div",
        { style: { padding: "80px 24px", maxWidth: 480, margin: "0 auto", fontFamily: "var(--font-body, Inter)", textAlign: "center" } },
        React.createElement(
          "h2",
          { style: { fontFamily: "var(--font-display, serif)", fontSize: 20, color: "var(--tx)", marginBottom: 12 } },
          "La médiathèque n'a pas pu s'afficher"
        ),
        React.createElement(
          "p",
          { style: { fontSize: 14, color: "var(--tx2)", marginBottom: 20 } },
          "Une erreur est survenue. Recharge la page pour réessayer."
        ),
        React.createElement(
          "button",
          { className: "btn btn--ghost", onClick: () => window.location.reload() },
          "Recharger"
        )
      );
    }
    return this.props.children;
  }
}

(async function boot(){
  const loader = document.createElement("div");
  loader.id = "mdt-loader";
  loader.style.cssText = "position:fixed;inset:0;z-index:8000;display:flex;align-items:center;"
    + "justify-content:center;background:var(--bg,#F5EFE4);font-family:'Inter',system-ui,sans-serif;"
    + "color:#5E524A;font-size:13px;letter-spacing:.06em;text-transform:uppercase";
  loader.innerHTML = "<div>Chargement de la médiathèque…</div>";
  document.body.appendChild(loader);

  // Delai de garde — miroir de celui de bootstrap.js (ADR-47). Sans lui,
  // « Chargement de la médiathèque… » reste affiché indéfiniment sur une
  // panne d'auth ou de réseau : c'est exactement le silence qui rendait
  // « PWA non utilisée » et « PWA cassée » indiscernables pendant trois
  // semaines, et cette PWA est la surface qui a motivé ADR-47.
  //
  // 8 s : meme valeur que bootstrap.js, meme raisonnement (assez large pour
  // ne pas alarmer sur un demarrage lent en 4G, assez court pour qu'on ne
  // referme pas l'app avant de voir le message).
  let bootStage = "libs";
  const bootGuard = setTimeout(() => {
    const l = document.getElementById("mdt-loader");
    if (!l) return;
    const label = (window.mobileView && window.mobileView.bootStageLabel(bootStage))
      || "Le demarrage est bloque. Recharge la page.";
    l.innerHTML =
      '<div style="max-width:320px;padding:0 24px;text-align:center;line-height:1.6;'
      + 'text-transform:none;letter-spacing:0;font-size:14px">'
      + '<div style="font-weight:600;margin-bottom:10px">La médiathèque ne démarre pas</div>'
      + '<div style="color:#8A7B6E">' + label + '</div></div>';
  }, 8000);

  const removeLoader = () => {
    clearTimeout(bootGuard);
    const l = document.getElementById("mdt-loader");
    if (l) l.remove();
  };

  // Rend la frontiere d'erreur (stable, cf. MdtErrorBoundary plus haut)
  // autour du panel, dont la key CHANGE a chaque appel : c'est un remount
  // complet, pas un simple re-render.
  //
  // Pourquoi un remount plutot qu'ajouter une dependance a un seul useMemo
  // (BLOCKING 1) : `evening` n'est pas la seule valeur derivee de l'heure —
  // pickTonight(), tonightHeadline(), airedToday() et les libelles
  // "aujourd'hui"/"demain" de l'agenda en dependent aussi. Changer la key
  // force React a demonter puis remonter tout le panel (au lieu de
  // reconcilier la fiber existante) : useState/useMemo repartent de zero et
  // TOUTES les valeurs derivees de l'heure sont recalculees, pas seulement
  // celle qu'on aurait pu penser a corriger en ajoutant une dependance.
  // Cout accepte : une feuille ouverte ou une recherche en cours se ferment
  // apres une absence de plus de 5 min (STALE_MS plus bas) — budget, types et
  // collectionOpen sont relus depuis localStorage au montage, rien de
  // durable n'est perdu.
  function renderPanel(){
    window.__mdtRoot.render(
      React.createElement(
        MdtErrorBoundary,
        null,
        React.createElement(window.PanelMediatheque, { key: "r" + Date.now() })
      )
    );
  }

  // Recharge les donnees Tier 2 et re-rend. Expose pour l'ecouteur de reprise.
  // Garde de re-entrance : un boolean suffit (pas de queue). Les GET sont
  // idempotents donc rien ne se corromprait sans elle, mais deux cycles
  // invalidate+fetch+render concurrents (ex. visibilitychange qui se
  // redeclenche pendant qu'un refresh est deja en vol) sont un gaspillage
  // evitable.
  let refreshing = false;
  async function refresh(){
    if (refreshing) return;
    refreshing = true;
    try {
      const dl = window.cockpitDataLoader;
      dl.invalidateCache("media_");
      dl.invalidateCache("jp_");
      dl.invalidateCache("user_profile");
      dl.invalidateCache("activity_brief");
      await loadData();
      if (window.__mdtRoot) renderPanel();
    } finally {
      refreshing = false;
    }
  }

  async function loadData(){
    const dl = window.cockpitDataLoader;
    const [, profileRows] = await Promise.all([
      dl.loadPanel("mediatheque").catch((e) => { console.error("[boot-mdt] Tier 2", e); return null; }),
      dl.loadUserProfile().catch((e) => { console.error("[boot-mdt] profil", e); return []; }),
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
      document.getElementById("root").textContent = "Échec du chargement.";
      return;
    }
    bootStage = "auth";
    await window.cockpitAuth.waitForAuth();
    bootStage = "tier2";
    await loadData();
  } catch (e) {
    console.error("[boot-mdt]", e);
  }

  // Babel standalone compile les scripts type="text/babel" de facon asynchrone,
  // APRES les scripts classiques : window.PanelMediatheque n'existe pas encore.
  bootStage = "mount";
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
  renderPanel();
  window.__mdtRefresh = refresh;

  // La PWA monte PanelMediatheque directement, sans passer par handleNavigate :
  // jusqu'ici elle n'emettait donc AUCUN `section_opened`, alors que c'est la
  // surface la plus utilisee du cockpit. `entry: "pwa"` la distingue des
  // ouvertures faites depuis l'onglet Mediatheque du cockpit complet.
  const trackOpen = (entry) => {
    try { window.track && window.track("section_opened", { section: "mediatheque", entry }); } catch {}
  };
  trackOpen("pwa");

  // iOS suspend une PWA plutot que de la fermer : rouverte le lendemain, elle
  // reprend l'etat de la veille et loadPanel est memoise par once(). On refetch
  // au retour au premier plan si l'absence a depasse le seuil.
  const STALE_MS = 5 * 60 * 1000;
  let hiddenAt = null;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > STALE_MS) {
      hiddenAt = null;
      // Un retour au premier plan apres plus de 5 min est une reouverture du
      // point de vue de l'usage : sans ca, une PWA laissee ouverte une semaine
      // ne compterait qu'une seule ouverture.
      trackOpen("pwa-resume");
      refresh().catch((e) => console.error("[boot-mdt] refresh", e));
    }
  });
})();
