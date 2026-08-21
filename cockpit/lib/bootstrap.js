// cockpit/lib/bootstrap.js
// Entry point. Runs BEFORE cockpit/app.jsx is parsed so it can set the
// __cockpitBootstrapPending flag; app.jsx then installs __cockpitMount()
// and waits for us to call it.
//
// Order of operations:
//   1. Wait for Google OAuth session (shows login overlay until signed in)
//   2. Run Tier 1 data loader (blocking — Home needs this)
//   3. Call window.__cockpitMount() to render <App/>
//   4. Hide the body loading state
//
// If Supabase is unreachable, we still mount with the fake data baked
// into cockpit/data*.js so the UI never looks broken.
window.__cockpitBootstrapPending = true;

(async function boot(){
  // Small loading overlay shown during auth + first fetch.
  const loader = document.createElement("div");
  loader.id = "cockpit-loader";
  loader.style.cssText = "position:fixed;inset:0;z-index:8000;display:flex;align-items:center;justify-content:center;background:var(--bg,#F5EFE4);font-family:'Inter',system-ui,sans-serif;color:#5E524A;font-size:13px;letter-spacing:.06em;text-transform:uppercase";
  loader.innerHTML = '<div>Chargement du cockpit…</div>';
  document.body.appendChild(loader);

  // Delai de garde. Sans lui, une panne d'authentification ou de reseau laisse
  // « Chargement du cockpit… » a l'ecran indefiniment : c'est exactement le
  // silence qui a rendu indiscernables « PWA non utilisee » et « PWA cassee »
  // pendant trois semaines (cf. spec 2026-08-21). La telemetrie ne peut pas
  // couvrir ce cas — usage_events exige une session — donc le diagnostic doit
  // s'afficher sur l'appareil.
  //
  // 8 s : assez large pour ne pas alarmer sur un demarrage lent en 4G, assez
  // court pour qu'on ne referme pas l'app avant de voir le message.
  let bootStage = "libs";
  const bootGuard = setTimeout(() => {
    const l = document.getElementById("cockpit-loader");
    if (!l) return;
    const label = (window.mobileView && window.mobileView.bootStageLabel(bootStage))
      || "Le demarrage est bloque. Recharge la page.";
    l.innerHTML =
      '<div style="max-width:320px;padding:0 24px;text-align:center;line-height:1.6;'
      + 'text-transform:none;letter-spacing:0;font-size:14px">'
      + '<div style="font-weight:600;margin-bottom:10px">Le cockpit ne demarre pas</div>'
      + '<div style="color:#8A7B6E">' + label + '</div></div>';
  }, 8000);

  function removeLoader(){
    clearTimeout(bootGuard);
    const l = document.getElementById("cockpit-loader");
    if (l) l.remove();
  }

  try {
    // Wait for lib scripts to be present (they're loaded right before this one).
    if (!window.sb || !window.cockpitAuth || !window.cockpitDataLoader) {
      console.error("[bootstrap] lib scripts missing");
      removeLoader();
      window.__cockpitMount && window.__cockpitMount();
      return;
    }

    // Phase 2: block on Google OAuth session.
    bootStage = "auth";
    await window.cockpitAuth.waitForAuth();

    // Phase 2: run Tier 1 loader — overrides window.COCKPIT_DATA with real data.
    bootStage = "tier1";
    try {
      await window.cockpitDataLoader.bootTier1();
      // Propagate Tier 1 rows into globals used by panels (APPRENTISSAGE_DATA.radar, etc.)
      window.cockpitDataLoader.hydrateGlobalsFromTier1();
    } catch (e) {
      console.error("[bootstrap] Tier 1 failed, keeping fake data", e);
    }

    // Phase 2.5: if we're deep-linked into a Tier 2 panel (#music, #perf…),
    // preload its data BEFORE mounting React. This kills the
    // refresh-shows-fake-for-a-second flash — by the time React renders,
    // window.*_DATA already holds real values (or we've failed and the
    // panel will show the error state).
    try {
      const initialPanel = (window.location.hash || "").replace(/^#/, "").trim();
      const dl = window.cockpitDataLoader;
      if (initialPanel && dl?.TIER2_PANELS?.has(initialPanel)) {
        bootStage = "tier2";
        await dl.loadPanel(initialPanel);
        // Flag consumed by App on first render so it skips the loader.
        window.__cockpitInitialPanelReady = initialPanel;
      }
    } catch (e) {
      console.error("[bootstrap] initial Tier 2 preload failed", e);
      // Fall through — App will surface an error state for this panel.
    }
  } catch (e) {
    console.error("[bootstrap]", e);
  }

  // Wait for app.jsx to finish parsing (Babel standalone compiles
  // type="text/babel" scripts asynchronously AFTER classic scripts).
  bootStage = "mount";
  let waited = 0;
  while (!window.__cockpitMount && waited < 15000) {
    await new Promise(r => setTimeout(r, 50));
    waited += 50;
  }
  removeLoader();
  if (window.__cockpitMount) window.__cockpitMount();
  else console.error("[bootstrap] __cockpitMount never registered");
})();
