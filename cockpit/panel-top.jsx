// Panel : Top du jour — magazine style
const { useState: useStateTop } = React;

function isoWeekTop(d){
  const t = new Date(d); t.setHours(0,0,0,0);
  t.setDate(t.getDate() + 3 - (t.getDay() + 6) % 7);
  const firstThursday = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round(((t - firstThursday) / 86400000 - 3 + (firstThursday.getDay() + 6) % 7) / 7);
}

// Opens article URL + marks read in localStorage (shared helper).
function openArticleTop(t){
  const url = t._url || t.url;
  if (!url) return;
  try {
    const id = t._id || t.id;
    if (id) {
      const rm = JSON.parse(localStorage.getItem("read-articles") || "{}");
      rm[id] = { ts: Date.now() };
      localStorage.setItem("read-articles", JSON.stringify(rm));
    }
  } catch {}
  window.open(url, "_blank", "noopener");
}

function exportTopAsMarkdown(items){
  const lines = items.map(t => {
    const rank = String(t.rank).padStart(2, "0");
    const url = t._url || t.url || "";
    const title = url ? `[${t.title}](${url})` : t.title;
    return `${rank}. **${title}** — ${t.source} · ${t.section} · ${t.date}${t.summary ? "\n    " + t.summary : ""}`;
  });
  const md = `# Top du jour — ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}\n\n` + lines.join("\n\n");
  try {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(md);
    else {
      const ta = document.createElement("textarea");
      ta.value = md; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
  } catch {}
}

function PanelTop({ data, onNavigate }) {
  const [filter, setFilter] = useStateTop("all");
  const [copied, setCopied] = useStateTop(false);
  const allTop = data.top || [];
  // Vrai dès qu'une sélection raisonnée existe pour aujourd'hui. Faux quand le
  // pipeline n'a pas tourné : l'en-tête ne doit alors rien promettre.
  const picked = allTop.some((t) => t.picked);
  const sections = ["all", ...new Set(allTop.map((t) => t.section).filter(Boolean))];
  const filtered = filter === "all" ? allTop : allTop.filter((t) => t.section === filter);
  const [feat1, feat2, feat3, ...rest] = filtered;

  const today = new Date();
  const weekNum = String(isoWeekTop(today)).padStart(2, "0");
  const dateLabel = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const handleExport = () => {
    exportTopAsMarkdown(filtered);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="panel-page">
      <div className="panel-hero">
        <div className="panel-hero-eyebrow">Top du jour · S{weekNum} · {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</div>
        <h1 className="panel-hero-title">
          {allTop.length === 0
            ? "Aucun top disponible pour aujourd'hui"
            : picked
              ? `${allTop.length} article${allTop.length > 1 ? "s" : ""} retenu${allTop.length > 1 ? "s" : ""} pour toi aujourd'hui`
              : `Les ${allTop.length} derniers articles récupérés`}
        </h1>
        {/* L'ancien sous-titre annonçait un « score calculé sur la pertinence
            pour ton rôle, la fraîcheur et la convergence de signaux entre
            sources ». Aucun de ces trois calculs n'existait : le score valait
            `94 - i * 6`. On décrit maintenant ce qui se passe réellement, y
            compris quand la sélection n'a pas tourné. */}
        <p className="panel-hero-sub">
          {picked
            ? "Sélection du jour, motivée article par article et recalibrée par tes retours. Le pouce en bas demande pourquoi — c'est ce motif qui affine les prochaines."
            : "La sélection du jour n'a pas tourné : voici simplement les derniers articles récupérés, sans tri ni classement."}
        </p>
      </div>

      <div className="panel-toolbar">
        <span className="panel-toolbar-label">Filtrer</span>
        <div className="panel-toolbar-group">
          {sections.map((s) => (
            <button
              key={s}
              className={`pill ${filter === s ? "is-active" : ""}`}
              onClick={() => setFilter(s)}
            >
              <span>{s === "all" ? "Tout" : s}</span>
              <span className="pill-count">{s === "all" ? allTop.length : allTop.filter((t) => t.section === s).length}</span>
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }} className="panel-toolbar-group">
          <button
            className="btn btn--ghost"
            onClick={handleExport}
            disabled={filtered.length === 0}
            title="Copie le top en markdown dans le presse-papier"
          >
            <Icon name="download" size={14} stroke={1.75} /> {copied ? "Copié !" : "Exporter"}
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--tx3)", fontFamily: "var(--font-sans)" }}>
          Pas encore d'articles pour ce filtre.
        </div>
      )}

      <div className="top-list-wrap">
        {feat1 && (
          <div className="top-list-feat">
            <article className="top-feat-main" onClick={() => openArticleTop(feat1)} style={feat1._url ? { cursor: "pointer" } : null}>
              <div className="top-feat-rank">01</div>
              <div className="top-feat-meta">
                <span className="top-reading">{(window.estimateReadingTime || (() => "—"))((feat1.summary || "") + " " + (feat1.title || ""))}</span>
                <span>{feat1.source}</span>
                <span>·</span>
                <span>{feat1.section}</span>
                <span>·</span>
                <span>{feat1.date}</span>
              </div>
              <h2 className="top-feat-title">{feat1.title}</h2>
              {feat1.why && <p className="top-feat-why">{feat1.why}</p>}
              <p className="top-feat-summary">{feat1.summary}</p>
              <div className="top-feat-foot">
                {/* Affichait `{feat1.score} / 100 · impact` — soit 94, toujours,
                    pour le premier article de la liste. Un « impact » qui ne
                    mesurait que la position dans un tableau. */}
                <div className="top-feat-score">
                  <span>{feat1.picked ? "sélection du jour" : feat1.section}</span>
                </div>
                <span>Lire →</span>
              </div>
            </article>
            {feat2 && (
              <article className="top-feat-side" onClick={() => openArticleTop(feat2)} style={feat2._url ? { cursor: "pointer" } : null}>
                <div className="top-feat-side-rank">02</div>
                <div className="top-feat-side-meta">
                  <span className="top-reading">{(window.estimateReadingTime || (() => "—"))((feat2.summary || "") + " " + (feat2.title || ""))}</span>
                  <span>{feat2.source}</span><span>·</span><span>{feat2.date}</span>
                </div>
                <h3 className="top-feat-side-title">{feat2.title}</h3>
                <p className="top-feat-side-summary">{feat2.summary}</p>
                <div className="top-feat-side-foot">
                  <span>{feat2.section}</span>
                  <span>{feat2.picked ? "sélection" : ""}</span>
                </div>
              </article>
            )}
            {feat3 && (
              <article className="top-feat-side" onClick={() => openArticleTop(feat3)} style={feat3._url ? { cursor: "pointer" } : null}>
                <div className="top-feat-side-rank">03</div>
                <div className="top-feat-side-meta">
                  <span className="top-reading">{(window.estimateReadingTime || (() => "—"))((feat3.summary || "") + " " + (feat3.title || ""))}</span>
                  <span>{feat3.source}</span><span>·</span><span>{feat3.date}</span>
                </div>
                <h3 className="top-feat-side-title">{feat3.title}</h3>
                <p className="top-feat-side-summary">{feat3.summary}</p>
                <div className="top-feat-side-foot">
                  <span>{feat3.section}</span>
                  <span>{feat3.picked ? "sélection" : ""}</span>
                </div>
              </article>
            )}
          </div>
        )}

        {rest.length > 0 && (
          <>
            <div className="top-rest-title">La suite du classement</div>
            <div className="top-rest-list">
              {rest.map((t) => (
                <div key={t.rank} className="top-rest-item" onClick={() => openArticleTop(t)} style={t._url ? { cursor: "pointer" } : null}>
                  <span className="top-rest-rank">{String(t.rank).padStart(2, "0")}</span>
                  <span className="top-rest-source top-rest-col--source">{t.source}</span>
                  <span className="top-rest-title-text">{t.title}</span>
                  <span className="top-rest-section top-rest-col--score">{t.section}</span>
                  <span className="top-rest-date top-rest-col--date">{t.date}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

window.PanelTop = PanelTop;
