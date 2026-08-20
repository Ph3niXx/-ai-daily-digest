// ═══════════════════════════════════════════════════════════════
// PANEL SANTÉ — l'état de la machinerie du cockpit, par domaine.
//
// Aucun fetch : pipeline_health est chargée en entier et sans filtre par
// bootTier1 (cf. cockpit/lib/data-loader.js). Ce panel est un rendu pur.
//
// Toute la logique (rendus, âges, phrases d'effet, groupement) vit dans
// cockpit/lib/sante-view.js, testée sous node. Ici, uniquement du JSX.
// ═══════════════════════════════════════════════════════════════

const { useState: useSaState } = React;

// Une section au vert se replie sur son titre : un jour normal, la page tient
// en sept lignes. Une section dégradée s'ouvre AU MONTAGE quel que soit l'état
// mémorisé — sinon on peut fermer une panne et ne plus jamais la revoir. Mais
// seulement au montage : après quoi le pli de l'utilisateur fait autorité pour
// le reste de la session. Un chevron qui ne répond pas est un bouton cassé, et
// « la mémoire ne doit pas cacher une panne » ne veut pas dire « on ne peut
// plus jamais replier ». La panne se rouvre d'elle-même à la visite suivante.
const SA_OPEN_KEY = "cockpit-sante-open";

function saReadOpen() {
  try { return JSON.parse(localStorage.getItem(SA_OPEN_KEY) || "{}"); }
  catch (e) { return {}; }
}
function saWriteOpen(state) {
  try { localStorage.setItem(SA_OPEN_KEY, JSON.stringify(state)); } catch (e) {}
}

function SaVerdict({ verdict }) {
  // L'heure, pas seulement le jour : entre 24 h et 48 h, « le 19 août » ne dit
  // pas si le contrôle du jour a tourné. Sur une page dont le sujet est la
  // fraîcheur, c'est précisément la question.
  const fmtDate = (ms) => new Date(ms).toLocaleString("fr-FR", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });

  if (verdict.empty) {
    // « n'a jamais écrit » serait une affirmation invérifiable ici : le fetch
    // de bootTier1 est en `.catch(() => [])`, un échec réseau produit le même
    // tableau vide qu'une table neuve. On dit ce qu'on sait.
    return (
      <aside className="sa-verdict is-empty" role="status">
        <div className="sa-verdict-head">
          <Icon name="plug" size={15} stroke={1.75} />
          <span className="sa-verdict-kicker">Aucun relevé</span>
        </div>
        <p className="sa-verdict-lede">
          Aucun relevé n'a pu être lu — soit le contrôle de santé n'a encore rien
          écrit, soit la lecture a échoué. Rien ne permet de dire que tout va bien
          — ni le contraire.
        </p>
      </aside>
    );
  }

  const tone = verdict.checkStale ? "warn" : (verdict.degraded ? "alert" : "ok");
  return (
    <aside className={`sa-verdict is-${tone}`} role="status" aria-label="Santé du cockpit">
      <div className="sa-verdict-head">
        <Icon name="plug" size={15} stroke={1.75} />
        <span className="sa-verdict-kicker">
          {verdict.degraded === 0
            ? "Tout tourne"
            : `${verdict.failing ? `${verdict.failing} en panne` : ""}` +
              `${verdict.failing && verdict.stale ? ", " : ""}` +
              `${verdict.stale ? `${verdict.stale} figé${verdict.stale > 1 ? "s" : ""}` : ""}`}
        </span>
        <span className="sa-verdict-count">
          {verdict.unmeasured > 0
            ? `${verdict.measured} mesurées sur ${verdict.total}`
            : `${verdict.total} briques surveillées`}
        </span>
      </div>
      {verdict.checkStale && (
        <p className="sa-verdict-warn">
          Le contrôle de santé n'a pas tourné depuis plus de 48 h — dernier relevé le{" "}
          {fmtDate(verdict.lastCheck)}. Tout ce qui suit peut être faux.
        </p>
      )}
      {!verdict.checkStale && verdict.lastCheck && (
        <p className="sa-verdict-lede">Dernier contrôle le {fmtDate(verdict.lastCheck)}.</p>
      )}
      {/* Principe 4 : « Tout tourne » ne doit pas s'étendre aux briques dont la
          fraîcheur n'est mesurée par personne. Leur vert ne prouve rien — c'est
          très exactement l'angle mort que cet onglet existe pour supprimer. */}
      {verdict.unmeasured > 0 && (
        <p className="sa-verdict-lede">
          {verdict.unmeasured === 1
            ? "Une brique n'est mesurée sur aucune fraîcheur : son vert ne prouve rien."
            : `${verdict.unmeasured} briques ne sont mesurées sur aucune fraîcheur : leur vert ne prouve rien.`}
        </p>
      )}
    </aside>
  );
}

function SaRow({ row, nav, now, sectionDegraded }) {
  const V = window.santeView;
  const render = V.renderOf(row);
  const degraded = V.isDegraded(row);
  const age = V.fmtAge(row, now);
  // Gabarit unique, partagé avec la phrase de section : la ligne ne la porte
  // que lorsque la section ne l'agrège pas (cf. sante-view.js::rowSummary).
  const effect = V.rowSummary(row, nav, sectionDegraded);

  return (
    <div className={`sa-row is-${render}`}>
      <div className="sa-row-head">
        <span className="sa-dot" aria-hidden="true" />
        <span className="sa-name">{row.label}</span>
        <span className="sa-state">{V.RENDER_LABELS[render]}</span>
        <span className="sa-age">
          {render === "unknown_freshness" ? "—" : (age || "—")}
        </span>
        {row.last_run_url ? (
          <a className="sa-link" href={row.last_run_url} target="_blank" rel="noopener noreferrer"
             title={`Voir le dernier run — ${row.label}`}
             aria-label={`Voir le dernier run — ${row.label}`}>
            <Icon name="arrow_right" size={13} stroke={2} />
          </a>
        ) : <span className="sa-link is-empty" aria-hidden="true" />}
      </div>

      {degraded && row.last_error && (
        <p className="sa-cause">{row.last_error}</p>
      )}
      {effect && <p className="sa-effect">{effect}</p>}
      {degraded && row.remediation && (
        <p className="sa-fix"><span className="sa-fix-arrow" aria-hidden="true">→</span> {row.remediation}</p>
      )}
    </div>
  );
}

function SaSection({ section, nav, now, open, onToggle }) {
  const V = window.santeView;
  const summary = V.sectionSummary(section.rows, nav);
  // Une seule chaîne pour l'œil et pour le lecteur d'écran : deux formulations
  // divergent dès qu'on en modifie une, et c'est l'aria qui perd.
  const state = V.sectionStateLabel(section);

  return (
    <section className={`sa-section ${section.degraded ? "is-degraded" : ""}`}>
      <button className="sa-section-head" onClick={onToggle}
              aria-expanded={open} aria-label={`${section.label} — ${state}`}>
        <Icon name={open ? "chevron_down" : "chevron_right"} size={14} stroke={2} />
        <h2 className="sa-section-title">{section.label}</h2>
        <span className="sa-section-state">{state}</span>
      </button>
      {summary && <p className="sa-section-summary">{summary}</p>}
      {open && (
        <div className="sa-section-body">
          {section.rows.map(r => (
            <SaRow key={r.pipeline_id} row={r} nav={nav} now={now}
                   sectionDegraded={section.degraded} />
          ))}
        </div>
      )}
    </section>
  );
}

function PanelSante({ data, onNavigate }) {
  const V = window.santeView;
  const now = Date.now();
  const rows = (data && data.pipeline_health) ||
               (window.COCKPIT_DATA && window.COCKPIT_DATA.pipeline_health) || [];
  const nav = window.COCKPIT_NAV || [];

  const verdict = V.globalVerdict(rows, now);
  const sections = V.groupByDomain(rows);

  // Amorçage au montage seulement : une section dégradée s'ouvre quoi qu'ait
  // replié l'utilisateur, puis son basculement fait autorité pour le reste de
  // la session. La panne se rouvrira à la prochaine visite — elle ne peut donc
  // pas être enterrée — et le chevron répond.
  const [open, setOpen] = useSaState(() => {
    const stored = saReadOpen();
    const init = {};
    for (const s of sections) init[s.key] = s.degraded > 0 || stored[s.key] === true;
    return init;
  });
  // On ne persiste que le geste de l'utilisateur, jamais l'ouverture d'office :
  // sinon une section réparée resterait dépliée pour toujours.
  const toggle = (key) => {
    const next = open[key] !== true;
    setOpen(Object.assign({}, open, { [key]: next }));
    const stored = saReadOpen();
    stored[key] = next;
    saWriteOpen(stored);
  };
  const isOpen = (key) => open[key] === true;

  return (
    <div className="sa-panel">
      <header className="sa-hero">
        <div className="sa-hero-eyebrow">Coulisses · santé du cockpit</div>
        <h1 className="sa-hero-title">Ce qui tourne, et ce qui ne tourne plus</h1>
        <p className="sa-hero-sub">
          Chaque brique de la machine, ce qu'elle alimente, et le geste qui la répare.
          Les sections au vert sont repliées.
        </p>
      </header>

      <SaVerdict verdict={verdict} />

      {sections.map(section => (
        <SaSection key={section.key} section={section} nav={nav} now={now}
                   open={isOpen(section.key)} onToggle={() => toggle(section.key)} />
      ))}
    </div>
  );
}

window.PanelSante = PanelSante;
