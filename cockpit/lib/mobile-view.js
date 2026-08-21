// cockpit/lib/mobile-view.js
// Logique pure du portage mobile — aucun DOM, testable sous node.
// Double export : window.mobileView (navigateur) + module.exports (tests),
// meme patron que lib/sante-view.js et lib/games-view.js.
(function(){
  // Palier unique du portage. styles-mobile.css et useIsMobile() DOIVENT
  // utiliser cette valeur. Deux paliers qui divergent produisent une bande
  // de largeurs ou le CSS replie et le JS ne replie pas — le pire des deux
  // mondes, et invisible tant qu'on ne teste pas pile a cette largeur.
  const MOBILE_MAX_WIDTH = 760;

  // Repli volontaire sur "desktop" quand la largeur n'est pas mesurable.
  // Inventer du "mobile" sur une mesure absente gonflerait la sonde d'usage
  // qui decide de la suite du programme.
  function viewportKind(width){
    if (typeof width !== "number" || !isFinite(width)) return "desktop";
    return width <= MOBILE_MAX_WIDTH ? "mobile" : "desktop";
  }

  // Libelles du delai de garde du loader. Ils sont lus par l'utilisateur sur
  // son telephone, ou aucun Web Inspector n'est joignable depuis Windows :
  // ils doivent dire quoi faire, pas nommer une fonction.
  const BOOT_STAGES = {
    libs:  "Les scripts du cockpit ne se sont pas charges. Recharge la page.",
    auth:  "La connexion Google reste bloquee. Ferme l'application et rouvre-la depuis son icone.",
    tier1: "Les donnees du cockpit n'arrivent pas — Supabase ne repond pas.",
    tier2: "Le chargement de cet onglet est bloque. Reviens au Brief et reessaie.",
    mount: "L'interface n'a pas fini de se compiler. Recharge la page.",
  };

  function bootStageLabel(stage){
    return BOOT_STAGES[stage] || "Le demarrage est bloque a une etape inconnue. Recharge la page.";
  }

  const api = { MOBILE_MAX_WIDTH, viewportKind, BOOT_STAGES, bootStageLabel };
  if (typeof window !== "undefined") window.mobileView = Object.assign(window.mobileView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
