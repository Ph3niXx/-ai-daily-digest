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

function useIsMobile(){
  const query = "(max-width: " + window.mobileView.MOBILE_MAX_WIDTH + "px)";
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

function PanelSection({ head, summary, hint, pinned = false, sectionClass = "", children }) {
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
      </summary>
      <div className="ps-body">{children}</div>
    </details>
  );
}

window.useIsMobile = useIsMobile;
window.PanelSection = PanelSection;
