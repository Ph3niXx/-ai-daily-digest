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
// en sept lignes. Mais une section qui DEVIENT dégradée s'ouvre, quel que soit
// ce que l'utilisateur avait replié — sinon on peut fermer une panne et ne
// plus jamais la revoir.
const SA_OPEN_KEY = "cockpit-sante-open";

function saReadOpen() {
  try { return JSON.parse(localStorage.getItem(SA_OPEN_KEY) || "{}"); }
  catch (e) { return {}; }
}
function saWriteOpen(state) {
  try { localStorage.setItem(SA_OPEN_KEY, JSON.stringify(state)); } catch (e) {}
}

function SaVerdict({ verdict }) {
  const fmtDate = (ms) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  if (verdict.empty) {
    return (
      <aside className="sa-verdict is-empty" role="status">
        <div className="sa-verdict-head">
          <Icon name="plug" size={15} stroke={1.75} />
          <span className="sa-verdict-kicker">Aucun relevé</span>
        </div>
        <p className="sa-verdict-lede">
          Le contrôle de santé n'a jamais écrit dans la base. Rien ne permet de dire
          que tout va bien — ni le contraire.
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
        <span className="sa-verdict-count">{verdict.total} briques surveillées</span>
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
    </aside>
  );
}

function SaRow({ row, nav, now }) {
  const V = window.santeView;
  const render = V.renderOf(row);
  const degraded = V.isDegraded(row);
  const age = V.fmtAge(row, now);
  const effectLabels = V.panelLabels(row.panels, nav);

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
      {degraded && (effectLabels.length > 0 || row.impact) && (
        <p className="sa-effect">
          {effectLabels.length > 0
            ? `${V.joinFr(effectLabels)} ${effectLabels.length > 1 ? "affichent" : "affiche"} encore des données figées.`
            : row.impact}
        </p>
      )}
      {degraded && row.remediation && (
        <p className="sa-fix"><span className="sa-fix-arrow" aria-hidden="true">→</span> {row.remediation}</p>
      )}
    </div>
  );
}

function SaSection({ section, nav, now, open, onToggle }) {
  const V = window.santeView;
  const summary = V.sectionSummary(section.rows, nav);
  const resting = section.rows.filter(r => V.renderOf(r) === "resting").length;

  return (
    <section className={`sa-section ${open ? "is-open" : ""} ${section.degraded ? "is-degraded" : ""}`}>
      <button className="sa-section-head" onClick={onToggle}
              aria-expanded={open} aria-label={`${section.label} — ${section.degraded ? "dégradé" : "tout va bien"}`}>
        <Icon name={open ? "chevron_down" : "chevron_right"} size={14} stroke={2} />
        <h2 className="sa-section-title">{section.label}</h2>
        <span className="sa-section-state">
          {section.degraded > 0
            ? `${section.degraded} dégradé${section.degraded > 1 ? "s" : ""}`
            : (resting > 0 ? `${section.rows.length} briques · ${resting} au repos` : "tout va bien")}
        </span>
      </button>
      {summary && <p className="sa-section-summary">{summary}</p>}
      {open && (
        <div className="sa-section-body">
          {section.rows.map(r => <SaRow key={r.pipeline_id} row={r} nav={nav} now={now} />)}
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

  const [stored, setStored] = useSaState(saReadOpen);
  const toggle = (key) => {
    const next = Object.assign({}, stored, { [key]: !isOpen(key) });
    setStored(next);
    saWriteOpen(next);
  };
  // Une section dégradée est ouverte, point. La mémoire ne sert qu'aux saines.
  function isOpen(key) {
    const section = sections.find(s => s.key === key);
    if (section && section.degraded > 0) return true;
    return stored[key] === true;
  }

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
