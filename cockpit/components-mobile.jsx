// cockpit/components-mobile.jsx
// Socle du portage mobile. Expose window.useIsMobile et window.PanelSection.
//
// Regle cardinale : AU-DESSUS DE 760 px, CE COMPOSANT NE DOIT RIEN CHANGER AU
// DOM. Il rend `head` puis `children`, dans un fragment ou dans la <section>
// que le panel lui indique — c'est-a-dire exactement ce que le panel rendait
// avant. C'est ce qui rend la contrainte « zero regression desktop »
// verifiable par lecture plutot qu'esperee : si vous devez ajouter une
// balise, une classe ou un wrapper dans la branche desktop, la contrainte est
// rompue et le probleme est ailleurs.
//
// REGLE POUR LES 28 ONGLETS A VENIR (vague 2) : sur mobile, `<summary>`
// REMPLACE `head` — il ne s'ajoute pas a cote. Tout element interactif place
// dans `head` (un lien "voir tout", un bouton d'action...) disparait donc du
// DOM mobile a moins d'etre aussi passe en `actions` (rendu dans le repli,
// apres le hint) ou deplace dans `children`. Quasiment chaque `.block-head`
// de ce depot porte un lien "voir tout" — attendez-vous a devoir traiter ce
// cas a chaque nouvel onglet porte, pas seulement pour ceux de cette vague.
//
// AUTRE PIEGE : franchir 760 px fait passer le rendu de fragment a <details>
// (ou l'inverse) — un changement de type d'element React, qui demonte puis
// remonte le sous-arbre. Tout etat local declare SOUS PanelSection est donc
// perdu au franchissement du seuil (redimensionnement de fenetre, rotation).
// La vague 2 inclut le Carnet d'idees, un onglet de saisie : l'etat d'un
// brouillon doit vivre AU-DESSUS de PanelSection, jamais en dessous.

function useIsMobile(){
  // Repli a 760 si mobile-view.js n'a pas charge (cf. le meme garde-fou dans
  // telemetry.js et bootstrap.js) : sans lui, l'acces direct a
  // `window.mobileView.MOBILE_MAX_WIDTH` leve pendant le rendu et l'error
  // boundary transforme le Brief en ecran d'erreur — y compris sur desktop,
  // ou aucune media query mobile ne devrait jamais s'appliquer. 760 est un
  // dernier recours pour un script absent ; mobile-view.js reste la seule
  // source de verite et les deux valeurs doivent changer ensemble.
  const maxWidth = (window.mobileView && window.mobileView.MOBILE_MAX_WIDTH) || 760;
  const query = "(max-width: " + maxWidth + "px)";
  const [matches, setMatches] = React.useState(
    () => window.matchMedia && window.matchMedia(query).matches
  );
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    // Resynchronisation au montage : la largeur a pu changer entre le
    // useState initial et l'effet (rotation de l'appareil pendant le boot).
    setMatches(mq.matches);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function PanelSection({ head, summary, hint, pinned = false, sectionClass = "", actions = null, children }) {
  const isMobile = useIsMobile();

  // Desktop, ou section epinglee sur mobile : rendu d'origine, intact.
  if (!isMobile || pinned) {
    const body = <>{head}{children}</>;
    return sectionClass ? <section className={sectionClass}>{body}</section> : body;
  }

  // Mobile : <details> natif. Pas de useState, pas de persistance —
  // l'element HTML porte son propre etat, l'accessibilite et le clavier
  // viennent avec, et iOS Safari le gere nativement.
  //
  // `head` n'est PAS rendu ici : le <summary> le remplace. Le rendre en plus
  // afficherait deux fois le titre une fois la section depliee.
  //
  // `sectionClass` n'est PAS reporte ici non plus, et c'est deliberé. Ces
  // classes decrivent une mise en page desktop : `block--two` est une grille
  // a deux colonnes qui attend ses `.col` en enfants DIRECTS. Sur le <details>
  // les enfants directs sont <summary> et .ps-body — la grille viserait le
  // chrome du repli au lieu du contenu. Le repli mobile est une colonne
  // unique par construction : il n'a besoin d'aucune de ces classes.
  return (
    <details className="ps">
      <summary className="ps-sum">
        <span className="ps-sum-title">{summary}</span>
        {hint ? <span className="ps-sum-hint">{hint}</span> : null}
        {actions ? (
          // Un element interactif dans <summary> declenche par defaut le
          // repli/depli natif au clic (le clic remonte jusqu'au <summary>,
          // qui bascule <details>). stopPropagation empeche le clic
          // d'atteindre <summary> : sans ca, "Ouvrir ma semaine" replierait
          // la section au lieu de naviguer.
          <span className="ps-sum-actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </span>
        ) : null}
      </summary>
      <div className="ps-body">{children}</div>
    </details>
  );
}

window.useIsMobile = useIsMobile;
window.PanelSection = PanelSection;
