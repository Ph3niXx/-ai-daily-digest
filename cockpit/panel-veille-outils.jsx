// ═══════════════════════════════════════════════════════════════
// PANEL VEILLE OUTILS — 3 sous-onglets
//   1. Veille hebdo : synthèse Cowork classée en 4 buckets
//   2. Catalogue écosystème : répertoire stable des outils inbound/outbound
//   3. Panorama : marché IA au sens large, rangé par cas d'usage et par prix
// ═══════════════════════════════════════════════════════════════

window.VEILLE_OUTILS_DATA = window.VEILLE_OUTILS_DATA || {
  items: [],
  summary: null,
  last_run: null,
  total: 0,
  by_category: {},
  ecosystem: [],
  panorama: [],
};

// ── Veille hebdo ───────────────────────────────────────────────
const VO_CATEGORIES = [
  { id: "jarvis_applicable",   label: "Applicables Jarvis",         hint: "Ce qui peut concrètement améliorer le cockpit ou Jarvis." },
  { id: "claude_general",      label: "Claude — usage général",     hint: "Bonnes pratiques pour Claude Code / Cowork au quotidien." },
  { id: "complementary_tools", label: "Outils complémentaires",     hint: "MCP, plugins, libs tierces autour de Claude." },
  { id: "other_news",          label: "Autres news",                hint: "Releases ou articles notables sans action immédiate." },
];

const VO_PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const VO_EFFORT_ORDER   = { XS: 0, S: 1, M: 2, L: 3 };
const VO_STATUS_LABEL   = {
  new: "Nouveau",
  in_progress: "En cours",
  applied: "Appliqué",
  dismissed: "Écarté",
};
const VO_STATUS_NEXT = {
  new: ["in_progress", "applied", "dismissed"],
  in_progress: ["applied", "dismissed", "new"],
  applied: ["in_progress", "new"],
  dismissed: ["new", "in_progress"],
};

// ── Catalogue écosystème ───────────────────────────────────────
const VO_DIRECTIONS = [
  { id: "inbound",  label: "Se pluggent à Claude", desc: "MCP servers, skills, plugins — ce qui enrichit Claude." },
  { id: "outbound", label: "Claude s'y plugge",     desc: "SDKs, IDE, frameworks — où on utilise Claude comme moteur." },
];
const VO_ECO_TYPES = [
  { id: "mcp_server",      label: "MCP" },
  { id: "skill",           label: "Skill" },
  { id: "cowork_plugin",   label: "Plugin Cowork" },
  { id: "ide_integration", label: "IDE" },
  { id: "framework",       label: "Framework" },
  { id: "connector",       label: "Connecteur" },
  { id: "sdk",             label: "SDK" },
  { id: "agent_runtime",   label: "Agent" },
  { id: "other",           label: "Autre" },
];
const VO_ECO_TYPE_LABEL = Object.fromEntries(VO_ECO_TYPES.map(t => [t.id, t.label]));

// ── Panorama ───────────────────────────────────────────────────
// Ordre = ordre d'affichage des sections. "core" d'abord, "context" ensuite :
// l'ordre encode la pertinence, il n'est pas alphabétique par hasard.
const VO_USE_CASES = [
  { id: "code",          label: "Agents de code et CLI",      zone: "core",    note: "Le classement d'août 2026 est mené par des agents en ligne de commande, pas par des IDE." },
  { id: "claude_stack",  label: "L'écosystème Claude payé",   zone: "core",    note: "Tout ce bloc est inclus dans un abonnement Pro à 20 $. Le gâchis courant est de payer Pro et de n'utiliser que le chat." },
  { id: "mcp",           label: "Serveurs MCP",               zone: "core",    note: "Un set court bat un set long : chaque serveur ajoute ses outils au budget de contexte, chaque credential élargit la surface de confiance." },
  { id: "veille",        label: "Veille, lecture, recherche", zone: "core",    note: "Le cockpit fait la collecte. Ces outils couvrent l'autre moitié : lire ce qui a été collecté, interroger un corpus fermé sans qu'il invente." },
  { id: "llm_local",     label: "LLM local sur 8 Go",         zone: "core",    note: "Le critère utile n'est pas le score, c'est « tient-il en VRAM au contexte dont j'ai besoin »." },
  { id: "orchestration", label: "Orchestration",              zone: "core",    note: "Deux familles : les canevas visuels quand l'IA n'est qu'une étape, les frameworks code quand l'agent est le produit." },
  { id: "data",          label: "Données et vectoriel",       zone: "core",    note: "La question n'est pas « quelle est la meilleure base vectorielle » mais « ai-je un volume qui justifie une base de plus »." },
  { id: "metier_rte",    label: "Métier RTE et cérémonies",   zone: "core",    note: "Le clivage décisif n'est pas la qualité du résumé, c'est la présence d'un robot dans la visio." },
  { id: "carriere",      label: "Carrière et opportunités",   zone: "core",    note: "Jobs Radar couvre le sourcing. Ces outils couvrent l'aval : adapter, passer les ATS, suivre le pipeline." },
  { id: "image",         label: "Image",                      zone: "context", note: "Le meilleur outil gratuit est aujourd'hui un modèle de frontière, pas un modèle au rabais." },
  { id: "video",         label: "Vidéo",                      zone: "context", note: "Facturation à la seconde produite. C'est le poste où l'on brûle un budget sans s'en rendre compte." },
  { id: "voix",          label: "Voix et transcription",      zone: "context", note: "La dictée est devenue un gain de vitesse au clavier. Whisper en local reste le plancher gratuit." },
  { id: "bureautique",   label: "Bureautique et documents",   zone: "context", note: "Le piège commun : des crédits gratuits en bloc unique, non renouvelés. Lis toujours si le free tier se recharge." },
  { id: "navigateur",    label: "Navigateur et computer-use", zone: "context", note: "Le cas d'usage réel : ce qui vit derrière un login sans API." },
  { id: "observabilite", label: "Observabilité et éval",      zone: "context", note: "Dès qu'un pipeline tourne en cron sans personne devant, tu as besoin de traces — sinon la panne se découvre des semaines plus tard." },
  { id: "agent_perso",   label: "Agents personnels",          zone: "context", note: "La catégorie qui a explosé en 2026, et celle où le rapport risque / bénéfice est le plus mal compris." },
  { id: "other",         label: "Autre",                      zone: "context", note: "" },
];
const VO_USE_CASE_LABEL = Object.fromEntries(VO_USE_CASES.map(u => [u.id, u.label]));

const VO_PRICING = [
  { id: "free",     label: "Gratuit" },
  { id: "freemium", label: "Freemium" },
  { id: "paid",     label: "Payant" },
];
const VO_PRICING_LABEL = Object.fromEntries(VO_PRICING.map(p => [p.id, p.label]));

// ── Helpers ────────────────────────────────────────────────────
function voSafeHtml(md) {
  try {
    if (!md) return "";
    const raw = window.marked ? window.marked.parse(String(md)) : String(md).replace(/\n/g, "<br>");
    return window.DOMPurify ? window.DOMPurify.sanitize(raw) : raw;
  } catch {
    return "";
  }
}

function voFormatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

function voSlugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// ── Badges (partagés veille + catalogue) ───────────────────────
function VOPriorityBadge({ p }) {
  if (!p) return null;
  return <span className={`vo-pri vo-pri--${p}`}>{p === "high" ? "haute" : p === "medium" ? "moy." : "basse"}</span>;
}
function VOEffortBadge({ e }) {
  if (!e) return null;
  return <span className="vo-eff" title={`Effort estimé : ${e}`}>{e}</span>;
}
function VOStatusBadge({ s }) {
  return <span className={`vo-status vo-status--${s}`}>{VO_STATUS_LABEL[s] || s}</span>;
}
function VODirectionBadge({ d }) {
  if (!d) return null;
  return <span className={`vo-dir vo-dir--${d}`}>{d === "inbound" ? "↘ inbound" : d === "outbound" ? "↗ outbound" : "↔ both"}</span>;
}
function VOEcoTypeBadge({ t }) {
  if (!t) return null;
  return <span className={`vo-eco-type vo-eco-type--${t}`}>{VO_ECO_TYPE_LABEL[t] || t}</span>;
}

// ─── Synthèse exécutive (_summary row) ─────────────────────────
function VOSummaryHero({ summary, lastRun }) {
  if (!summary) return null;
  return (
    <article className="vo-summary">
      <div className="vo-summary-eyebrow">
        Synthèse exécutive · {voFormatDate(lastRun || summary.run_date)}
      </div>
      <h2 className="vo-summary-title">{summary.title || "Synthèse de la semaine"}</h2>
      <div
        className="vo-summary-body"
        dangerouslySetInnerHTML={{ __html: voSafeHtml(summary.summary) }}
      />
    </article>
  );
}

// ─── Veille hebdo : item card ──────────────────────────────────
function VOItemCard({ item, onPatch, busy }) {
  const [notes, setNotes] = React.useState(item.notes || "");
  const [notesDirty, setNotesDirty] = React.useState(false);
  const [howOpen, setHowOpen] = React.useState(item.category === "jarvis_applicable");

  React.useEffect(() => {
    setNotes(item.notes || "");
    setNotesDirty(false);
  }, [item.id, item.notes]);

  const saveNotes = () => {
    if (!notesDirty) return;
    onPatch(item.id, { notes });
    setNotesDirty(false);
  };

  const onStatus = (next) => {
    if (busy || next === item.status) return;
    onPatch(item.id, { status: next });
  };

  const hostname = (() => {
    try { return item.source_url ? new URL(item.source_url).hostname.replace(/^www\./, "") : null; }
    catch { return null; }
  })();

  return (
    <article className={`vo-card vo-card--${item.category} vo-card--${item.status} ${busy ? "is-busy" : ""}`}>
      <header className="vo-card-head">
        <div className="vo-card-meta">
          <VOStatusBadge s={item.status} />
          <VOPriorityBadge p={item.priority} />
          <VOEffortBadge e={item.effort} />
          {item.source_name && <span className="vo-card-src">{item.source_name}</span>}
        </div>
        <h3 className="vo-card-title">
          {item.source_url ? (
            <a href={item.source_url} target="_blank" rel="noopener noreferrer">{item.title}</a>
          ) : item.title}
        </h3>
        {hostname && <div className="vo-card-host">{hostname}</div>}
      </header>

      {item.summary && (
        <p className="vo-card-summary">{item.summary}</p>
      )}

      {item.applicability && (
        <div className="vo-card-applic">
          <div className="vo-card-applic-label">Applicabilité</div>
          <div>{item.applicability}</div>
        </div>
      )}

      {item.how_to_apply && (
        <div className="vo-card-how">
          <button
            className="vo-card-how-toggle"
            onClick={() => setHowOpen(o => !o)}
            aria-expanded={howOpen}
          >
            <span>{howOpen ? "▾" : "▸"} Comment l'appliquer</span>
          </button>
          {howOpen && (
            <div
              className="vo-card-how-body"
              dangerouslySetInnerHTML={{ __html: voSafeHtml(item.how_to_apply) }}
            />
          )}
        </div>
      )}

      {item.trend_context && (
        <div className="vo-card-trend">
          <span className="vo-card-trend-label">Tendance</span> {item.trend_context}
        </div>
      )}

      <div className="vo-card-actions">
        <div className="vo-card-status-menu">
          {(VO_STATUS_NEXT[item.status] || []).map(n => (
            <button
              key={n}
              className={`vo-card-status-btn vo-card-status-btn--${n}`}
              onClick={() => onStatus(n)}
              disabled={busy}
            >
              → {VO_STATUS_LABEL[n]}
            </button>
          ))}
        </div>

        <textarea
          className="vo-card-notes"
          placeholder="Notes perso (sauvegardé en quittant le champ)"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
          onBlur={saveNotes}
          disabled={busy}
          rows={2}
        />
      </div>
    </article>
  );
}

// ─── Section par catégorie (veille hebdo) ──────────────────────
function VOSection({ category, items, onPatch, pending }) {
  if (!items.length) return null;
  return (
    <section className={`vo-section vo-section--${category.id}`}>
      <div className="vo-section-head">
        <h3 className="vo-section-title">{category.label}</h3>
        <span className="vo-section-count">{items.length}</span>
        <span className="vo-section-hint">{category.hint}</span>
      </div>
      <div className="vo-section-list">
        {items.map(it => (
          <VOItemCard
            key={it.id}
            item={it}
            onPatch={onPatch}
            busy={!!(pending && pending[it.id])}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Catalogue : item card ─────────────────────────────────────
function VOEcoCard({ item, onPatch, busy }) {
  const [notes, setNotes] = React.useState(item.user_notes || "");
  const [notesDirty, setNotesDirty] = React.useState(false);
  const [hintOpen, setHintOpen] = React.useState(false);
  const [appOpen, setAppOpen]   = React.useState(false);

  React.useEffect(() => {
    setNotes(item.user_notes || "");
    setNotesDirty(false);
  }, [item.id, item.user_notes]);

  const saveNotes = () => {
    if (!notesDirty) return;
    onPatch(item.id, { user_notes: notes });
    setNotesDirty(false);
  };

  const togglePin = () => onPatch(item.id, { is_pinned: !item.is_pinned });
  const setPriority = (p) => onPatch(item.id, { user_priority: p === item.user_priority ? null : p });
  const setStatus = (s) => onPatch(item.id, { status: s });

  return (
    <article className={`vo-eco-card vo-eco-card--${item.direction} vo-eco-card--${item.status} ${item.is_pinned ? "vo-eco-card--pinned" : ""} ${busy ? "is-busy" : ""}`}>
      <div className="vo-eco-card-head">
        <div className="vo-eco-card-meta">
          <VODirectionBadge d={item.direction} />
          <VOEcoTypeBadge t={item.type} />
          {item.vendor && <span className="vo-eco-card-vendor">{item.vendor}</span>}
        </div>
        <button
          className={`vo-eco-pin ${item.is_pinned ? "is-active" : ""}`}
          onClick={togglePin}
          disabled={busy}
          title={item.is_pinned ? "Désépingler" : "Épingler en haut"}
          aria-label="Épingler"
        >
          {item.is_pinned ? "★" : "☆"}
        </button>
      </div>

      <h4 className="vo-eco-card-title">
        {item.source_url ? (
          <a href={item.source_url} target="_blank" rel="noopener noreferrer">{item.name}</a>
        ) : item.name}
      </h4>

      {item.description && <p className="vo-eco-card-desc">{item.description}</p>}

      {item.applicability && (
        <div className="vo-eco-card-collapse">
          <button className="vo-eco-card-collapse-toggle" onClick={() => setAppOpen(o => !o)}>
            {appOpen ? "▾" : "▸"} Applicabilité projet
          </button>
          {appOpen && <div className="vo-eco-card-collapse-body">{item.applicability}</div>}
        </div>
      )}

      {item.install_hint && (
        <div className="vo-eco-card-collapse">
          <button className="vo-eco-card-collapse-toggle" onClick={() => setHintOpen(o => !o)}>
            {hintOpen ? "▾" : "▸"} Comment l'installer / tester
          </button>
          {hintOpen && (
            <div className="vo-eco-card-collapse-body">
              <code>{item.install_hint}</code>
            </div>
          )}
        </div>
      )}

      {Array.isArray(item.tags) && item.tags.length > 0 && (
        <div className="vo-eco-card-tags">
          {item.tags.slice(0, 8).map(t => (
            <span key={t} className="vo-eco-tag">#{t}</span>
          ))}
        </div>
      )}

      <div className="vo-eco-card-foot">
        <div className="vo-eco-card-priority">
          <span className="vo-eco-card-priority-label">Priorité</span>
          {["high", "medium", "low"].map(p => (
            <button
              key={p}
              className={`vo-eco-pri-btn vo-eco-pri-btn--${p} ${item.user_priority === p ? "is-active" : ""}`}
              onClick={() => setPriority(p)}
              disabled={busy}
            >{p === "high" ? "haute" : p === "medium" ? "moy." : "basse"}</button>
          ))}
        </div>

        <div className="vo-eco-card-status">
          {item.status === "active" && (
            <button className="vo-eco-card-status-btn" onClick={() => setStatus("dismissed")} disabled={busy}>
              Écarter
            </button>
          )}
          {item.status === "dismissed" && (
            <button className="vo-eco-card-status-btn" onClick={() => setStatus("active")} disabled={busy}>
              Réactiver
            </button>
          )}
          {item.status === "archived" && (
            <button className="vo-eco-card-status-btn" onClick={() => setStatus("active")} disabled={busy}>
              Réactiver
            </button>
          )}
          {item.status !== "active" && (
            <span className={`vo-eco-card-status-tag vo-eco-card-status-tag--${item.status}`}>
              {item.status === "dismissed" ? "écarté" : "archivé"}
            </span>
          )}
        </div>

        <textarea
          className="vo-eco-card-notes"
          placeholder="Note perso (save on blur)"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
          onBlur={saveNotes}
          disabled={busy}
          rows={1}
        />
      </div>
    </article>
  );
}

// ─── Catalogue : vue 2 colonnes ────────────────────────────────
function CatalogueView({ items, pending, onPatch, onAddManual }) {
  const [typeFilter, setTypeFilter] = React.useState(() => {
    try { return localStorage.getItem("vo.eco.typeFilter") || "all"; } catch { return "all"; }
  });
  const [hideDismissed, setHideDismissed] = React.useState(() => {
    try { return localStorage.getItem("vo.eco.hideDismissed") !== "0"; } catch { return true; }
  });
  const [tagFilter, setTagFilter] = React.useState([]);

  React.useEffect(() => { try { localStorage.setItem("vo.eco.typeFilter", typeFilter); } catch {} }, [typeFilter]);
  React.useEffect(() => { try { localStorage.setItem("vo.eco.hideDismissed", hideDismissed ? "1" : "0"); } catch {} }, [hideDismissed]);

  const allTags = React.useMemo(() => {
    const m = new Map();
    items.forEach(it => (it.tags || []).forEach(t => m.set(t, (m.get(t) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);

  const filtered = React.useMemo(() => {
    return items.filter(it => {
      if (hideDismissed && (it.status === "dismissed" || it.status === "archived")) return false;
      if (typeFilter !== "all" && it.type !== typeFilter) return false;
      if (tagFilter.length > 0 && !(it.tags || []).some(t => tagFilter.includes(t))) return false;
      return true;
    });
  }, [items, hideDismissed, typeFilter, tagFilter]);

  const sortFn = (a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    const pa = VO_PRIORITY_ORDER[a.user_priority] ?? 99;
    const pb = VO_PRIORITY_ORDER[b.user_priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return String(a.name).localeCompare(String(b.name));
  };

  const both     = filtered.filter(i => i.direction === "both").sort(sortFn);
  const inbound  = filtered.filter(i => i.direction === "inbound").sort(sortFn);
  const outbound = filtered.filter(i => i.direction === "outbound").sort(sortFn);

  return (
    <div className="vo-catalogue">
      <div className="vo-catalogue-toolbar">
        <div className="vo-filters-group">
          <span className="vo-filters-label">Type</span>
          <button
            className={`pill ${typeFilter === "all" ? "is-active" : ""}`}
            onClick={() => setTypeFilter("all")}
          >Tous</button>
          {VO_ECO_TYPES.map(t => (
            <button
              key={t.id}
              className={`pill ${typeFilter === t.id ? "is-active" : ""}`}
              onClick={() => setTypeFilter(t.id)}
            >{t.label}</button>
          ))}
        </div>
        <label className="vo-filters-toggle">
          <input
            type="checkbox"
            checked={hideDismissed}
            onChange={(e) => setHideDismissed(e.target.checked)}
          />
          <span>Masquer écartés + archivés</span>
        </label>
        <button className="btn btn--primary" onClick={onAddManual} style={{marginLeft: "auto"}}>
          + Ajouter une intégration
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="vo-eco-tags-bar">
          {allTags.slice(0, 16).map(([t, n]) => {
            const active = tagFilter.includes(t);
            return (
              <button
                key={t}
                className={`vo-eco-tag-chip ${active ? "is-active" : ""}`}
                onClick={() => setTagFilter(prev => active ? prev.filter(x => x !== t) : [...prev, t])}
              >#{t} <span className="vo-eco-tag-count">{n}</span></button>
            );
          })}
          {tagFilter.length > 0 && (
            <button className="vo-eco-tag-clear" onClick={() => setTagFilter([])}>× clear</button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="vo-empty">
          <p>Aucune intégration ne matche ces filtres.</p>
          <p className="vo-empty-sub">Élargis les filtres ou ajoute une intégration manuellement.</p>
        </div>
      ) : (
        <>
          {both.length > 0 && (
            <section className="vo-eco-both">
              <div className="vo-eco-both-head">
                <h3 className="vo-eco-both-title">↔ Bidirectionnels</h3>
                <span className="vo-section-count">{both.length}</span>
              </div>
              <div className="vo-eco-both-list">
                {both.map(it => (
                  <VOEcoCard key={it.id} item={it} onPatch={onPatch} busy={!!pending[it.id]} />
                ))}
              </div>
            </section>
          )}

          <div className="vo-eco-cols">
            {VO_DIRECTIONS.map(dir => {
              const list = dir.id === "inbound" ? inbound : outbound;
              return (
                <section key={dir.id} className={`vo-eco-col vo-eco-col--${dir.id}`}>
                  <div className="vo-eco-col-head">
                    <h3 className="vo-eco-col-title">{dir.label}</h3>
                    <span className="vo-section-count">{list.length}</span>
                    <p className="vo-eco-col-desc">{dir.desc}</p>
                  </div>
                  <div className="vo-eco-col-list">
                    {list.length === 0 ? (
                      <div className="vo-eco-col-empty">—</div>
                    ) : list.map(it => (
                      <VOEcoCard key={it.id} item={it} onPatch={onPatch} busy={!!pending[it.id]} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Modal "+ Ajouter une intégration" ─────────────────────────
// ─── Panorama : pastille prix (pleine / moitié / creuse) ───────
// La forme porte l'info, pas seulement la couleur : lisible en N&B et
// sans jugement de valeur (payant n'est pas "rouge = mauvais").
function VOPricingDot({ tier }) {
  return (
    <span
      className={`vo-pano-dot vo-pano-dot--${tier}`}
      title={VO_PRICING_LABEL[tier] || tier}
      aria-hidden="true"
    />
  );
}

function VOPanoCard({ item, onPatch, busy }) {
  const [notes, setNotes] = React.useState(item.user_notes || "");
  const [notesDirty, setNotesDirty] = React.useState(false);

  React.useEffect(() => {
    setNotes(item.user_notes || "");
    setNotesDirty(false);
  }, [item.id, item.user_notes]);

  const saveNotes = () => {
    if (!notesDirty) return;
    onPatch(item.id, { user_notes: notes });
    setNotesDirty(false);
  };

  const togglePin = () => onPatch(item.id, { is_pinned: !item.is_pinned });
  const setPriority = (p) => onPatch(item.id, { user_priority: p === item.user_priority ? null : p });
  const setStatus = (s) => onPatch(item.id, { status: s });

  return (
    <article className={`vo-pano-card vo-pano-card--${item.status} ${item.is_pinned ? "vo-pano-card--pinned" : ""} ${busy ? "is-busy" : ""}`}>
      <div className="vo-pano-card-head">
        <h4 className="vo-pano-card-title">
          {item.source_url ? (
            <a href={item.source_url} target="_blank" rel="noopener noreferrer">{item.name}</a>
          ) : item.name}
        </h4>
        <button
          className={`vo-eco-pin ${item.is_pinned ? "is-active" : ""}`}
          onClick={togglePin}
          disabled={busy}
          title={item.is_pinned ? "Désépingler" : "Épingler en haut"}
          aria-label="Épingler"
        >
          {item.is_pinned ? "★" : "☆"}
        </button>
      </div>

      <div className="vo-pano-price">
        <VOPricingDot tier={item.pricing_tier} />
        <span>{item.pricing_note || VO_PRICING_LABEL[item.pricing_tier]}</span>
      </div>

      {item.description && <p className="vo-pano-card-desc">{item.description}</p>}

      {item.meta_note && <div className="vo-pano-card-meta">{item.meta_note}</div>}

      {item.applicability && (
        <p className="vo-pano-card-why">
          <b>Chez toi&nbsp;:</b> {item.applicability}
        </p>
      )}

      {Array.isArray(item.tags) && item.tags.length > 0 && (
        <div className="vo-eco-card-tags">
          {item.tags.slice(0, 6).map(t => (
            <span key={t} className="vo-eco-tag">#{t}</span>
          ))}
        </div>
      )}

      <div className="vo-eco-card-foot">
        <div className="vo-eco-card-priority">
          <span className="vo-eco-card-priority-label">Priorité</span>
          {["high", "medium", "low"].map(p => (
            <button
              key={p}
              className={`vo-eco-pri-btn vo-eco-pri-btn--${p} ${item.user_priority === p ? "is-active" : ""}`}
              onClick={() => setPriority(p)}
              disabled={busy}
            >{p === "high" ? "haute" : p === "medium" ? "moy." : "basse"}</button>
          ))}
        </div>

        <div className="vo-eco-card-status">
          {item.status === "active" ? (
            <button className="vo-eco-card-status-btn" onClick={() => setStatus("dismissed")} disabled={busy}>
              Écarter
            </button>
          ) : (
            <button className="vo-eco-card-status-btn" onClick={() => setStatus("active")} disabled={busy}>
              Réactiver
            </button>
          )}
          {item.status !== "active" && (
            <span className={`vo-eco-card-status-tag vo-eco-card-status-tag--${item.status}`}>
              {item.status === "dismissed" ? "écarté" : "archivé"}
            </span>
          )}
        </div>

        <textarea
          className="vo-eco-card-notes"
          placeholder="Note perso (save on blur)"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
          onBlur={saveNotes}
          disabled={busy}
          rows={1}
        />
      </div>
    </article>
  );
}

// ─── Panorama : vue par cas d'usage ────────────────────────────
function PanoramaView({ items, pending, onPatch }) {
  const [priceFilter, setPriceFilter] = React.useState(() => {
    try { return localStorage.getItem("vo.pano.price") || "all"; } catch { return "all"; }
  });
  const [zoneFilter, setZoneFilter] = React.useState(() => {
    try { return localStorage.getItem("vo.pano.zone") || "all"; } catch { return "all"; }
  });
  const [useCaseFilter, setUseCaseFilter] = React.useState(() => {
    try { return localStorage.getItem("vo.pano.useCase") || "all"; } catch { return "all"; }
  });
  const [hideDismissed, setHideDismissed] = React.useState(() => {
    try { return localStorage.getItem("vo.pano.hideDismissed") !== "0"; } catch { return true; }
  });
  const [query, setQuery] = React.useState("");

  React.useEffect(() => { try { localStorage.setItem("vo.pano.price", priceFilter); } catch {} }, [priceFilter]);
  React.useEffect(() => { try { localStorage.setItem("vo.pano.zone", zoneFilter); } catch {} }, [zoneFilter]);
  React.useEffect(() => { try { localStorage.setItem("vo.pano.useCase", useCaseFilter); } catch {} }, [useCaseFilter]);
  React.useEffect(() => { try { localStorage.setItem("vo.pano.hideDismissed", hideDismissed ? "1" : "0"); } catch {} }, [hideDismissed]);

  const q = query.trim().toLowerCase();

  const filtered = React.useMemo(() => items.filter(it => {
    if (hideDismissed && it.status !== "active") return false;
    if (priceFilter !== "all" && it.pricing_tier !== priceFilter) return false;
    if (zoneFilter !== "all" && it.relevance !== zoneFilter) return false;
    if (useCaseFilter !== "all" && it.use_case !== useCaseFilter) return false;
    if (q) {
      const hay = `${it.name} ${it.description || ""} ${it.pricing_note || ""} ${it.meta_note || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [items, hideDismissed, priceFilter, zoneFilter, useCaseFilter, q]);

  const grouped = React.useMemo(() => {
    const out = {};
    VO_USE_CASES.forEach(u => out[u.id] = []);
    filtered.forEach(it => { (out[it.use_case] || (out[it.use_case] = [])).push(it); });
    Object.values(out).forEach(list => list.sort((a, b) => {
      if (!!b.is_pinned !== !!a.is_pinned) return b.is_pinned ? 1 : -1;
      return String(a.name).localeCompare(String(b.name));
    }));
    return out;
  }, [filtered]);

  // Les cas d'usage présents dans les données, pour ne pas proposer un filtre vide
  const presentUseCases = React.useMemo(
    () => VO_USE_CASES.filter(u => items.some(i => i.use_case === u.id)),
    [items]
  );

  return (
    <>
      <div className="vo-filters vo-filters--pano">
        <div className="vo-filters-group">
          <span className="vo-filters-label">Prix</span>
          <button className={`pill ${priceFilter === "all" ? "is-active" : ""}`} onClick={() => setPriceFilter("all")}>Tous</button>
          {VO_PRICING.map(p => (
            <button
              key={p.id}
              className={`pill pill--dot ${priceFilter === p.id ? "is-active" : ""}`}
              onClick={() => setPriceFilter(p.id)}
            ><VOPricingDot tier={p.id} />{p.label}</button>
          ))}
        </div>

        <div className="vo-filters-group">
          <span className="vo-filters-label">Terrain</span>
          {[
            { id: "all",     label: "Tout" },
            { id: "core",    label: "Le tien" },
            { id: "context", label: "Au-delà" },
          ].map(z => (
            <button
              key={z.id}
              className={`pill ${zoneFilter === z.id ? "is-active" : ""}`}
              onClick={() => setZoneFilter(z.id)}
            >{z.label}</button>
          ))}
        </div>

        <div className="vo-filters-group">
          <span className="vo-filters-label">Usage</span>
          <select
            className="vo-pano-select"
            value={useCaseFilter}
            onChange={(e) => setUseCaseFilter(e.target.value)}
            aria-label="Filtrer par cas d'usage"
          >
            <option value="all">Tous les cas d'usage</option>
            {presentUseCases.map(u => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </div>

        <input
          className="vo-pano-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un outil…"
          aria-label="Chercher un outil"
        />

        <label className="vo-filters-toggle">
          <input
            type="checkbox"
            checked={hideDismissed}
            onChange={(e) => setHideDismissed(e.target.checked)}
          />
          <span>Masquer écartés + archivés</span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="vo-empty">
          <p>Aucun outil ne matche les filtres.</p>
          <p className="vo-empty-sub">
            Élargis le prix ou le terrain. Le panorama est rafraîchi par la passe 2 de la routine mensuelle « Catalogue écosystème Claude ».
          </p>
        </div>
      ) : (
        VO_USE_CASES.map(uc => {
          const list = grouped[uc.id] || [];
          if (!list.length) return null;
          return (
            <section key={uc.id} className={`vo-pano-section vo-pano-section--${uc.zone}`}>
              <div className="vo-pano-section-head">
                <h3>{uc.label}</h3>
                <span className="vo-pano-section-count">{list.length}</span>
                <span className={`vo-pano-zone vo-pano-zone--${uc.zone}`}>
                  {uc.zone === "core" ? "ton terrain" : "au-delà"}
                </span>
              </div>
              {uc.note && <p className="vo-pano-section-note">{uc.note}</p>}
              <div className="vo-pano-grid">
                {list.map(it => (
                  <VOPanoCard key={it.id} item={it} onPatch={onPatch} busy={!!pending[it.id]} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}

function AddIntegrationModal({ open, onClose, onSave, busy, errMsg }) {
  const [name, setName] = React.useState("");
  const [direction, setDirection] = React.useState("inbound");
  const [type, setType] = React.useState("mcp_server");
  const [vendor, setVendor] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [applicability, setApplicability] = React.useState("");
  const [installHint, setInstallHint] = React.useState("");
  const [tagsInput, setTagsInput] = React.useState("");
  const [slugCustom, setSlugCustom] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName(""); setDirection("inbound"); setType("mcp_server"); setVendor("");
      setSourceUrl(""); setDescription(""); setApplicability(""); setInstallHint("");
      setTagsInput(""); setSlugCustom("");
    }
  }, [open]);

  if (!open) return null;

  const computedSlug = slugCustom.trim() || voSlugify(name);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!name.trim() || !description.trim()) return;
    const tags = tagsInput
      .split(/[,\s]+/)
      .map(t => t.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean);
    onSave({
      slug: computedSlug,
      name: name.trim(),
      direction,
      type,
      vendor: vendor.trim() || null,
      source_url: sourceUrl.trim() || null,
      description: description.trim(),
      applicability: applicability.trim() || null,
      install_hint: installHint.trim() || null,
      tags,
    });
  };

  return (
    <div className="vo-modal-overlay" onClick={onClose}>
      <form className="vo-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="vo-modal-head">
          <h3>+ Ajouter une intégration</h3>
          <button type="button" className="vo-modal-x" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="vo-modal-body">
          <label className="vo-modal-field">
            <span>Nom *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex : MCP Slack" required autoFocus />
          </label>

          <label className="vo-modal-field">
            <span>Slug (auto si vide)</span>
            <input value={slugCustom} onChange={(e) => setSlugCustom(e.target.value)} placeholder={voSlugify(name) || "auto-généré"} />
          </label>

          <div className="vo-modal-row">
            <label className="vo-modal-field">
              <span>Direction *</span>
              <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="inbound">Inbound (se plugge à Claude)</option>
                <option value="outbound">Outbound (utilise Claude)</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className="vo-modal-field">
              <span>Type *</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {VO_ECO_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
          </div>

          <div className="vo-modal-row">
            <label className="vo-modal-field">
              <span>Vendeur</span>
              <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Anthropic, Hamel, ..." />
            </label>
            <label className="vo-modal-field">
              <span>URL source</span>
              <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
            </label>
          </div>

          <label className="vo-modal-field">
            <span>Description *</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
          </label>

          <label className="vo-modal-field">
            <span>Applicabilité projet</span>
            <textarea value={applicability} onChange={(e) => setApplicability(e.target.value)} rows={2} placeholder="En quoi c'est utile au projet Jarvis / mission RTE ?" />
          </label>

          <label className="vo-modal-field">
            <span>Comment l'installer / tester</span>
            <input value={installHint} onChange={(e) => setInstallHint(e.target.value)} placeholder="ex : pip install xxx" />
          </label>

          <label className="vo-modal-field">
            <span>Tags (séparés par virgule ou espace)</span>
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="rag, monitoring, jira" />
          </label>

          {errMsg && <div className="vo-modal-err">{errMsg}</div>}
        </div>

        <div className="vo-modal-foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn--primary" disabled={busy || !name.trim() || !description.trim()}>
            {busy ? "Sauvegarde..." : "Ajouter"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PANEL
// ═══════════════════════════════════════════════════════════════
function PanelVeilleOutils({ data, onNavigate }) {
  const VO = window.VEILLE_OUTILS_DATA || { items: [], summary: null, ecosystem: [], panorama: [] };
  const allItems = Array.isArray(VO.items) ? VO.items : [];
  const allEco = Array.isArray(VO.ecosystem) ? VO.ecosystem : [];
  const allPano = Array.isArray(VO.panorama) ? VO.panorama : [];

  const [tab, setTab] = React.useState(() => {
    try { return localStorage.getItem("vo.tab") || "veille"; } catch { return "veille"; }
  });
  const [hideDone, setHideDone] = React.useState(() => {
    try { return localStorage.getItem("vo.hideDone") !== "0"; } catch { return true; }
  });
  const [priFilter, setPriFilter] = React.useState(() => {
    try { return localStorage.getItem("vo.priFilter") || "all"; } catch { return "all"; }
  });
  const [pending, setPending] = React.useState({});
  const [, force] = React.useState(0);

  // Modal "+ Ajouter une intégration"
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalBusy, setModalBusy] = React.useState(false);
  const [modalErr, setModalErr] = React.useState(null);

  React.useEffect(() => { try { localStorage.setItem("vo.tab", tab); } catch {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem("vo.hideDone", hideDone ? "1" : "0"); } catch {} }, [hideDone]);
  React.useEffect(() => { try { localStorage.setItem("vo.priFilter", priFilter); } catch {} }, [priFilter]);

  // ── Veille hebdo : filtrage / tri ────────────────────────────
  const filtered = React.useMemo(() => {
    return allItems.filter(it => {
      if (hideDone && (it.status === "applied" || it.status === "dismissed")) return false;
      if (priFilter !== "all" && it.priority !== priFilter) return false;
      return true;
    }).sort((a, b) => {
      const pa = VO_PRIORITY_ORDER[a.priority] ?? 99;
      const pb = VO_PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      const ea = VO_EFFORT_ORDER[a.effort] ?? 99;
      const eb = VO_EFFORT_ORDER[b.effort] ?? 99;
      if (ea !== eb) return ea - eb;
      return String(a.title).localeCompare(String(b.title));
    });
  }, [allItems, hideDone, priFilter]);

  const byCategory = React.useMemo(() => {
    const out = {};
    VO_CATEGORIES.forEach(c => out[c.id] = []);
    filtered.forEach(it => {
      if (out[it.category]) out[it.category].push(it);
    });
    return out;
  }, [filtered]);

  // ── Stats hero (par tab) ─────────────────────────────────────
  const veilleStats = React.useMemo(() => {
    const total = allItems.length;
    const newCount = allItems.filter(i => i.status === "new").length;
    const highCount = allItems.filter(i => i.priority === "high" && i.status !== "applied" && i.status !== "dismissed").length;
    const appliedCount = allItems.filter(i => i.status === "applied").length;
    return { total, newCount, highCount, appliedCount };
  }, [allItems]);

  const ecoStats = React.useMemo(() => {
    const active = allEco.filter(i => i.status === "active");
    const inboundCount  = active.filter(i => i.direction === "inbound").length;
    const outboundCount = active.filter(i => i.direction === "outbound").length;
    const pinnedCount   = active.filter(i => i.is_pinned).length;
    const dismissedCount = allEco.filter(i => i.status === "dismissed").length;
    return { total: active.length, inboundCount, outboundCount, pinnedCount, dismissedCount };
  }, [allEco]);

  const panoStats = React.useMemo(() => {
    const active = allPano.filter(i => i.status === "active");
    return {
      total: active.length,
      freeCount: active.filter(i => i.pricing_tier === "free").length,
      coreCount: active.filter(i => i.relevance === "core").length,
      pinnedCount: active.filter(i => i.is_pinned).length,
      lastSeen: active.reduce((max, r) => (r.last_seen && r.last_seen > max ? r.last_seen : max), ""),
    };
  }, [allPano]);

  // ── PATCH veille item ────────────────────────────────────────
  const patchItem = async (id, patch) => {
    if (pending[id]) return;
    if (!window.sb || !window.SUPABASE_URL) return;
    setPending(p => ({ ...p, [id]: true }));
    try {
      const url = `${window.SUPABASE_URL}/rest/v1/claude_veille?id=eq.${encodeURIComponent(id)}`;
      const r = await window.sb.patchJSON(url, patch);
      if (!r.ok) throw new Error("patch " + r.status);
      const idx = allItems.findIndex(i => i.id === id);
      if (idx >= 0) {
        allItems[idx] = { ...allItems[idx], ...patch };
        window.VEILLE_OUTILS_DATA.items = allItems;
      }
      try {
        if (patch.status) window.track && window.track("veille_outils_status_changed", { id, to: patch.status });
        if (patch.notes !== undefined) window.track && window.track("veille_outils_notes_saved", { id });
      } catch {}
      force(v => v + 1);
    } catch (e) {
      console.error("[veille-outils] patch failed", e);
    } finally {
      setPending(p => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  // ── PATCH ecosystem item ─────────────────────────────────────
  const patchEcoItem = async (id, patch) => {
    if (pending[id]) return;
    if (!window.sb || !window.SUPABASE_URL) return;
    setPending(p => ({ ...p, [id]: true }));
    try {
      const url = `${window.SUPABASE_URL}/rest/v1/claude_ecosystem?id=eq.${encodeURIComponent(id)}`;
      const r = await window.sb.patchJSON(url, patch);
      if (!r.ok) throw new Error("patch " + r.status);
      const idx = allEco.findIndex(i => i.id === id);
      if (idx >= 0) {
        allEco[idx] = { ...allEco[idx], ...patch };
        window.VEILLE_OUTILS_DATA.ecosystem = allEco;
      }
      try {
        const evt = patch.is_pinned !== undefined ? "ecosystem_pin_toggled"
                  : patch.status ? "ecosystem_status_changed"
                  : patch.user_priority !== undefined ? "ecosystem_priority_set"
                  : patch.user_notes !== undefined ? "ecosystem_notes_saved"
                  : "ecosystem_patched";
        window.track && window.track(evt, { id });
      } catch {}
      force(v => v + 1);
    } catch (e) {
      console.error("[veille-outils] eco patch failed", e);
    } finally {
      setPending(p => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  // ── PATCH panorama item ──────────────────────────────────────
  const patchPanoItem = async (id, patch) => {
    if (pending[id]) return;
    if (!window.sb || !window.SUPABASE_URL) return;
    setPending(p => ({ ...p, [id]: true }));
    try {
      const url = `${window.SUPABASE_URL}/rest/v1/ai_landscape?id=eq.${encodeURIComponent(id)}`;
      const r = await window.sb.patchJSON(url, patch);
      if (!r.ok) throw new Error("patch " + r.status);
      const idx = allPano.findIndex(i => i.id === id);
      if (idx >= 0) {
        allPano[idx] = { ...allPano[idx], ...patch };
        window.VEILLE_OUTILS_DATA.panorama = allPano;
      }
      try {
        const evt = patch.is_pinned !== undefined ? "panorama_pin_toggled"
                  : patch.status ? "panorama_status_changed"
                  : patch.user_priority !== undefined ? "panorama_priority_set"
                  : patch.user_notes !== undefined ? "panorama_notes_saved"
                  : "panorama_patched";
        window.track && window.track(evt, { id });
      } catch {}
      force(v => v + 1);
    } catch (e) {
      console.error("[veille-outils] panorama patch failed", e);
    } finally {
      setPending(p => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  // ── INSERT manual ecosystem item ─────────────────────────────
  const addEcoManual = async (payload) => {
    if (!window.sb || !window.SUPABASE_URL) {
      setModalErr("Client Supabase indisponible.");
      return;
    }
    setModalBusy(true);
    setModalErr(null);
    try {
      const url = `${window.SUPABASE_URL}/rest/v1/claude_ecosystem`;
      const rows = await window.sb.postJSON(url, {
        ...payload,
        added_date: new Date().toISOString().slice(0, 10),
        last_seen: new Date().toISOString().slice(0, 10),
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (row && row.id) {
        allEco.unshift(row);
        window.VEILLE_OUTILS_DATA.ecosystem = allEco;
        force(v => v + 1);
        try { window.track && window.track("ecosystem_added_manual", { slug: payload.slug }); } catch {}
        setModalOpen(false);
      } else {
        setModalErr("Réponse vide — vérifie les permissions RLS.");
      }
    } catch (e) {
      const msg = String(e);
      if (msg.includes("23505") || msg.toLowerCase().includes("duplicate")) {
        setModalErr(`Le slug "${payload.slug}" existe déjà — choisis-en un autre.`);
      } else {
        setModalErr("Échec de l'ajout : " + msg.slice(0, 200));
      }
    } finally {
      setModalBusy(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="panel-page" data-screen-label="Veille outils">
      {/* HERO */}
      <div className="panel-hero">
        <div className="panel-hero-eyebrow">
          {tab === "veille" && <>Veille outils Claude · dernière exécution {voFormatDate(VO.last_run)}</>}
          {tab === "catalogue" && <>Catalogue écosystème · {ecoStats.total} intégrations actives</>}
          {tab === "panorama" && <>Panorama IA · {panoStats.total} outils · relevé du {voFormatDate(panoStats.lastSeen)}</>}
        </div>
        <h1 className="panel-hero-title">
          {tab === "veille" && (
            <>Ce qui bouge côté <em>Claude</em>.<br/>Trié pour toi, pas pour le bruit.</>
          )}
          {tab === "catalogue" && (
            <>L'<em>écosystème</em> qui se branche à Claude.<br/>Et où Claude se branche.</>
          )}
          {tab === "panorama" && (
            <>Le marché, rangé par <em>usage</em>.<br/>Et par ce qu'il coûte vraiment.</>
          )}
        </h1>
        <p className="panel-hero-sub">
          {tab === "veille" && "Synthèse hebdo d'une routine Cowork : nouveautés Claude Code / Cowork, skills, MCP, retours d'expérience. 4 buckets pour décider vite ce que tu appliques."}
          {tab === "catalogue" && "Catalogue stable des outils inbound (qui se pluggent dans Claude) et outbound (où Claude est utilisé comme moteur). Mis à jour mensuellement par une routine Cowork dédiée + ajouts manuels."}
          {tab === "panorama" && "Panorama du marché IA au-delà de Claude, rangé par cas d'usage et par modèle économique. Chaque outil porte son prix en clair, et la distinction entre ton terrain direct et ce qu'il faut simplement savoir situer."}
        </p>

        {/* Tab toggle */}
        <div className="vo-tabs">
          <button
            className={`vo-tab ${tab === "veille" ? "is-active" : ""}`}
            onClick={() => setTab("veille")}
          >
            Veille hebdo
            <span className="vo-tab-count">{veilleStats.total}</span>
          </button>
          <button
            className={`vo-tab ${tab === "catalogue" ? "is-active" : ""}`}
            onClick={() => setTab("catalogue")}
          >
            Catalogue écosystème
            <span className="vo-tab-count">{ecoStats.total}</span>
          </button>
          <button
            className={`vo-tab ${tab === "panorama" ? "is-active" : ""}`}
            onClick={() => setTab("panorama")}
          >
            Panorama
            <span className="vo-tab-count">{panoStats.total}</span>
          </button>
        </div>

        {/* Stats per tab */}
        {tab === "veille" ? (
          <div className="vo-herometa">
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val">{veilleStats.total}</span>
              <span>items totaux</span>
            </div>
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val vo-herometa-val--new">{veilleStats.newCount}</span>
              <span>nouveaux</span>
            </div>
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val vo-herometa-val--high">{veilleStats.highCount}</span>
              <span>priorité haute en attente</span>
            </div>
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val">{veilleStats.appliedCount}</span>
              <span>appliqués</span>
            </div>
          </div>
        ) : tab === "catalogue" ? (
          <div className="vo-herometa">
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val">{ecoStats.total}</span>
              <span>actives</span>
            </div>
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val vo-herometa-val--new">{ecoStats.inboundCount}</span>
              <span>↘ inbound</span>
            </div>
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val vo-herometa-val--high">{ecoStats.outboundCount}</span>
              <span>↗ outbound</span>
            </div>
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val">{ecoStats.pinnedCount}</span>
              <span>épinglés</span>
            </div>
          </div>
        ) : (
          <div className="vo-herometa">
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val">{panoStats.total}</span>
              <span>outils recensés</span>
            </div>
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val vo-herometa-val--new">{panoStats.freeCount}</span>
              <span>gratuits sans réserve</span>
            </div>
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val vo-herometa-val--high">{panoStats.coreCount}</span>
              <span>sur ton terrain</span>
            </div>
            <div className="vo-herometa-stat">
              <span className="vo-herometa-val">{panoStats.pinnedCount}</span>
              <span>épinglés</span>
            </div>
          </div>
        )}
      </div>

      {/* CONTENT PER TAB */}
      {tab === "veille" ? (
        <>
          <VOSummaryHero summary={VO.summary} lastRun={VO.last_run} />

          <div className="vo-filters">
            <div className="vo-filters-group">
              <span className="vo-filters-label">Priorité</span>
              {[
                { id: "all",    label: "Toutes" },
                { id: "high",   label: "Haute" },
                { id: "medium", label: "Moyenne" },
                { id: "low",    label: "Basse" },
              ].map(p => (
                <button
                  key={p.id}
                  className={`pill ${priFilter === p.id ? "is-active" : ""}`}
                  onClick={() => setPriFilter(p.id)}
                >{p.label}</button>
              ))}
            </div>
            <label className="vo-filters-toggle">
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(e) => setHideDone(e.target.checked)}
              />
              <span>Masquer appliqués + écartés</span>
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="vo-empty">
              <p>Aucun item ne matche les filtres.</p>
              <p className="vo-empty-sub">
                La routine Cowork tourne chaque samedi matin. Si tu n'as encore rien vu, lance-la depuis Cowork (skill <code>schedule</code>) ou attends le prochain run.
              </p>
            </div>
          ) : (
            VO_CATEGORIES.map(cat => (
              <VOSection
                key={cat.id}
                category={cat}
                items={byCategory[cat.id] || []}
                onPatch={patchItem}
                pending={pending}
              />
            ))
          )}
        </>
      ) : tab === "catalogue" ? (
        <CatalogueView
          items={allEco}
          pending={pending}
          onPatch={patchEcoItem}
          onAddManual={() => { setModalErr(null); setModalOpen(true); }}
        />
      ) : (
        <PanoramaView
          items={allPano}
          pending={pending}
          onPatch={patchPanoItem}
        />
      )}

      <AddIntegrationModal
        open={modalOpen}
        busy={modalBusy}
        errMsg={modalErr}
        onClose={() => setModalOpen(false)}
        onSave={addEcoManual}
      />
    </div>
  );
}

window.PanelVeilleOutils = PanelVeilleOutils;
