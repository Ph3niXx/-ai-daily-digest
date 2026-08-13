// ═══════════════════════════════════════════════════════════════
// PANEL GAMING — cross-platform (Steam + PSN + Xbox + Riot)
// ─────────────────────────────────────────────
// Hero : last session + 4 plateformes
// §1 En cours — cards avec progression HLTB
// Ma bibliothèque — statuts déclarés (remplace backlog/abandonnés/top, lot 2)
// §3 Activité (courbe 180j + heatmap 24×7)
// §4 Genres
// §7 Achievements récents
// §8 2026 milestones
// ═══════════════════════════════════════════════════════════════

const { useState: useGmState, useMemo: useGmMemo } = React;

const GM_STATUS_ORDER = ["playing", "wishlist", "finished", "dropped", "unqualified"];

// La bibliotheque n'affiche JAMAIS de compteur de « jeux a qualifier » :
// 86 jeux sans statut est un etat normal, pas une dette. Un arriere affiche
// produit culpabilite puis evitement — c'est ce qui a tue l'outil precedent.
function GmLibrary({ cards, onOpen }) {
  const V = window.gamesView;
  if (!cards.length) {
    return <div className="gm-empty">Aucun jeu ne correspond à ce filtre.</div>;
  }
  return (
    <div className="gm-lib-grid">
      {cards.map((c) => {
        const st = V.statusOf(c);
        const rating = V.ratingOf(c);
        return (
          <button className={`gm-lib-card is-${st}`} key={c.t.id} onClick={() => onOpen(c)}>
            {c.t.cover_url
              ? <div className="gm-lib-cover" style={{ backgroundImage: `url("${c.t.cover_url}")` }} />
              : <div className="gm-lib-cover is-empty" />}
            <div className="gm-lib-body">
              <div className="gm-lib-name">{c.t.name}</div>
              <div className="gm-lib-meta">
                <span className={`gm-lib-chip is-${st}`}>{V.STATUS_LABELS[st]}</span>
                <span className="gm-lib-hours">{V.hoursLabel(c.minutes)}</span>
                {rating != null && <span className="gm-lib-rating">{rating}</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Chart activity ──────────────────────────────────
function GmActivityChart({ series, range }) {
  const w = 1000, h = 200;
  const padL = 44, padR = 16, padT = 16, padB = 26;
  const plotW = w - padL - padR, plotH = h - padT - padB;

  const windowDays = { "30j": 30, "90j": 90, "180j": 180 }[range] || series.length;
  const data = series.slice(-windowDays);
  const vals = data.map((d) => d.hours);
  const rawMax = Math.max(...vals, 0);
  const yMax = rawMax > 0 ? rawMax * 1.1 : 1; // évite division par 0 quand série vide
  const yMin = 0;

  const x = (i) => padL + (i / (data.length - 1)) * plotW;
  const y = (v) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const avg = data.map((_, i) => {
    const start = Math.max(0, i - 3);
    const end = Math.min(data.length, i + 4);
    const slice = data.slice(start, end).map((d) => d.hours);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
  const linePath = "M" + avg.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" L");
  const barW = Math.max(1, plotW / data.length - 1);

  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => yMin + (i / (yTickCount - 1)) * (yMax - yMin));
  const tickCount = 6;
  const tIdx = Array.from({ length: tickCount }, (_, i) => Math.floor((i / (tickCount - 1)) * (data.length - 1)));
  const fmt = (s) => new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <svg className="gm-chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {yTicks.map((t, i) => (
        <g key={"y" + i}>
          <line className="gm-chart-grid" x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} />
          <text className="gm-chart-label" x={padL - 8} y={y(t) + 3} textAnchor="end">{t.toFixed(1)}h</text>
        </g>
      ))}
      <line className="gm-chart-axis" x1={padL} x2={w - padR} y1={h - padB} y2={h - padB} />
      {tIdx.map((t, i) => (
        <text key={"x" + i} className="gm-chart-label" x={x(t)} y={h - padB + 15} textAnchor="middle">
          {fmt(data[t].date)}
        </text>
      ))}
      {data.map((d, i) => (
        <rect
          key={i}
          x={x(i) - barW / 2}
          y={y(d.hours)}
          width={barW}
          height={Math.max(0, (h - padB) - y(d.hours))}
          fill="var(--accent)"
          opacity="0.22"
        />
      ))}
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Rail « À venir » — les suites annoncées des licences suivies. C'est la
// raison d'être du tracker : le reste de l'onglet raconte le passé, cette
// section est la seule qui parle de ce qui arrive.
function GmUpcoming({ items, onAck, onUnwatch }) {
  if (!items.length) {
    return (
      <div className="gm-empty">
        Rien d'annoncé dans tes licences suivies pour l'instant. Le suivi tourne
        tous les matins ; un jeu apparaîtra ici dès qu'il sera annoncé.
      </div>
    );
  }
  return (
    <div className="gm-up-grid">
      {items.map((it) => (
        <article className="gm-up-card" key={it.id}>
          {it.cover
            ? <div className="gm-up-cover" style={{ backgroundImage: `url("${it.cover}")` }} />
            : <div className="gm-up-cover is-empty" />}
          <div className="gm-up-body">
            <div className="gm-up-name">{it.name}</div>
            {it.licence && <div className="gm-up-licence">{it.licence}</div>}
            <div className="gm-up-when">
              {it.when || "date inconnue"}
              {it.precision === "year" || it.precision === "quarter"
                ? <span className="gm-up-approx"> · approximatif</span> : null}
            </div>
            <div className="gm-up-actions">
              <button className="gm-up-btn" onClick={() => onAck(it)} title="J'ai vu">✓ vu</button>
              <button className="gm-up-btn is-dismiss" onClick={() => onUnwatch(it)}
                      title="Ne plus suivre cette licence">✕ licence</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// ── Heatmap ─────────────────────────────────────────
function GmHeatmap({ grid }) {
  const DOW = ["L", "M", "M", "J", "V", "S", "D"];
  const reordered = [1, 2, 3, 4, 5, 6, 0].map((i) => grid[i]);
  const max = Math.max(...grid.flat());
  const color = (v) => {
    if (v < 0.5) return "var(--bd)";
    const t = Math.min(1, v / max);
    const alpha = 0.15 + t * 0.85;
    return `color-mix(in srgb, var(--brand) ${Math.round(alpha * 100)}%, transparent)`;
  };
  return (
    <div>
      <div className="gm-heatmap-grid">
        {reordered.map((row, r) => (
          <React.Fragment key={r}>
            <div className="gm-heatmap-row-label">{DOW[r]}</div>
            {row.map((v, h) => (
              <div key={h} className="gm-heatmap-cell" style={{ background: color(v) }} title={`${DOW[r]} ${h}h · ${v.toFixed(1)}h moy.`} />
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="gm-heatmap-hours">
        <span></span>
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h}>{h % 3 === 0 ? h : ""}</span>
        ))}
      </div>
    </div>
  );
}

// Fiche jeu — le seul endroit où l'utilisateur écrit. Quatre statuts en un
// tap ; la note et la plateforme n'apparaissent qu'une fois un statut posé,
// parce que `game_progress.status` est NOT NULL et contraint à ces quatre
// valeurs : il n'existe pas de ligne « sans statut ».
function GmSheet({ card, franchise, onClose, onStatus, onRating, onPlatform, onWatch, platforms }) {
  const V = window.gamesView;
  if (!card) return null;
  const st = V.statusOf(card);
  const rating = V.ratingOf(card);
  const ttb = V.ttbLabel(card.t.time_to_beat_minutes);
  return (
    <div className="gm-sheet-backdrop" onClick={onClose}>
      <div className="gm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={card.t.name}>
        <button className="gm-sheet-close" onClick={onClose} aria-label="Fermer">✕</button>
        <div className="gm-sheet-head">
          {card.t.cover_url && <div className="gm-sheet-cover" style={{ backgroundImage: `url("${card.t.cover_url}")` }} />}
          <div>
            <h3 className="gm-sheet-title">{card.t.name}</h3>
            {franchise && <div className="gm-sheet-licence">{franchise.name}</div>}
            <div className="gm-sheet-facts">
              <span>{V.hoursLabel(card.minutes)}</span>
              {ttb && <span> · {ttb}</span>}
              {card.t.release_human && <span> · {card.t.release_human}</span>}
            </div>
            {(card.t.genres || []).length > 0 &&
              <div className="gm-sheet-genres">{card.t.genres.join(" · ")}</div>}
          </div>
        </div>

        <div className="gm-sheet-block">
          <div className="gm-sheet-label">Où j'en suis</div>
          <div className="gm-sheet-row">
            {["wishlist", "playing", "finished", "dropped"].map((s) => (
              <button key={s} className={`gm-sheet-btn ${st === s ? "is-on" : ""}`}
                      onClick={() => onStatus(card, s)}>
                {V.STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {st !== "unqualified" && (
          <>
            <div className="gm-sheet-block">
              <div className="gm-sheet-label">Ma note</div>
              <input className="gm-sheet-rating" type="number" min="0" max="100"
                     placeholder="0–100" defaultValue={rating == null ? "" : rating}
                     onBlur={(e) => {
                       const v = e.target.value.trim();
                       onRating(card, v === "" ? null : Math.max(0, Math.min(100, Number(v))));
                     }} />
            </div>
            <div className="gm-sheet-block">
              <div className="gm-sheet-label">Sur quelle plateforme</div>
              <div className="gm-sheet-row">
                {platforms.map((p) => (
                  <button key={p}
                          className={`gm-sheet-btn ${card.prog && card.prog.platform === p ? "is-on" : ""}`}
                          onClick={() => onPlatform(card, p)}>{p}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {franchise && (
          <div className="gm-sheet-block">
            <label className="gm-sheet-watch">
              <input type="checkbox" defaultChecked={!!franchise.watched}
                     onChange={(e) => onWatch(franchise.id, e.target.checked)} />
              M'avertir des prochaines sorties de <strong>{franchise.name}</strong>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel ───────────────────────────────────────────
function PanelGaming({ onNavigate }) {
  const D = window.GAMING_PERSO_DATA;
  const [chartRange, setChartRange] = useGmState("90j");

  const G = (D && D.games) || { titles: [], franchises: [], progress: [], releases: [] };
  const [relLocal, setRelLocal] = React.useState(null);
  const releases = relLocal || G.releases;
  const titlesById = React.useMemo(
    () => Object.fromEntries((G.titles || []).map((t) => [t.id, t])), [G.titles]);
  const franchisesById = React.useMemo(
    () => Object.fromEntries((G.franchises || []).map((f) => [f.id, f])), [G.franchises]);
  const upcoming = React.useMemo(
    () => window.gamesView.buildUpcoming(releases, titlesById, franchisesById),
    [releases, titlesById, franchisesById]);

  const [libQuery, setLibQuery] = React.useState("");
  const [libStatuses, setLibStatuses] = React.useState([]);
  const [libSort, setLibSort] = React.useState("hours");
  const [progLocal, setProgLocal] = React.useState(null);
  const progressRows = progLocal || G.progress;
  const [sheetCard, setSheetCard] = React.useState(null);

  const library = React.useMemo(
    () => window.gamesView.buildLibrary(G.titles, progressRows, (D && D._raw && D._raw.snapshot) || []),
    [G.titles, progressRows, D]);
  const libraryView = React.useMemo(() => {
    const V = window.gamesView;
    return V.sortLibrary(
      V.filterByStatus(library, libStatuses).filter((c) => V.matchesQuery(c, libQuery)),
      libSort);
  }, [library, libStatuses, libQuery, libSort]);

  function toggleStatus(s) {
    setLibStatuses((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : cur.concat([s]));
  }

  const PLATFORMS = ["PC", "PlayStation", "Xbox", "Switch", "Autre"];

  // game_progress appartient a l'utilisateur : le front est le seul a y
  // ecrire. Upsert manuel — une ligne peut ne pas exister encore (86 jeux
  // seedes par le pipeline n'en ont aucune).
  async function writeProgress(card, patch) {
    const before = progressRows;
    const existing = before.find((p) => p.title_id === card.t.id);
    const next = existing
      ? before.map((p) => (p.title_id === card.t.id ? { ...p, ...patch } : p))
      : before.concat([{ title_id: card.t.id, status: "unqualified", ...patch }]);
    setProgLocal(next);
    try {
      if (existing) {
        await gmPatch("/rest/v1/game_progress?title_id=eq." + card.t.id,
                      { ...patch, updated_at: new Date().toISOString() });
      } else {
        await window.sb.postJSON(window.SUPABASE_URL + "/rest/v1/game_progress",
                                 { title_id: card.t.id, ...patch });
      }
      // Les track() partent APRES l'ecriture reussie, jamais avant (meme
      // convention que ackRelease/unwatchFranchise ci-dessus) : games_status_set
      // est la sonde de survie du lot 2, un compteur qui monte sur une
      // ecriture refusee fausserait la mesure.
      if ("status" in patch) window.track && window.track("games_status_set", { status: patch.status });
      if ("rating" in patch) window.track && window.track("games_rate", {});
    } catch (e) {
      setProgLocal(before);
      window.track && window.track("error_shown", { context: "games_progress", message: e.message });
    }
  }

  async function toggleWatch(franchiseId, watched) {
    try {
      await gmPatch("/rest/v1/game_franchises?id=eq." + franchiseId, { watched });
      window.track && window.track("games_watch_toggle", { watched });
    } catch (e) {
      window.track && window.track("error_shown", { context: "games_watch", message: e.message });
    }
  }

  // window.sb.patchJSON renvoie la Response BRUTE et ne leve pas sur 4xx/5xx
  // (cockpit/lib/supabase.js), contrairement a postJSON. Sans ce controle, un
  // refus RLS passerait pour un succes et la carte disparaitrait sans que
  // rien ne soit ecrit.
  async function gmPatch(path, body) {
    const r = await window.sb.patchJSON(window.SUPABASE_URL + path, body);
    if (!r.ok) throw new Error(String(r.status));
    return r;
  }

  // Les track() partent APRES le PATCH reussi, jamais avant (meme convention
  // que cockpit/home.jsx::GamesBriefCard) : ces compteurs sont la sonde de
  // survie du lot (docs/telemetry.md), un compteur qui monte sur une
  // ecriture refusee fausse la decision.
  async function ackRelease(it) {
    const before = releases;
    setRelLocal(before.map((r) => (r.id === it.id ? { ...r, acknowledged: true } : r)));
    try {
      await gmPatch("/rest/v1/game_releases?id=eq." + it.id, { acknowledged: true });
      const src = releases.find((r) => r.id === it.id);
      window.track && window.track("games_release_ack",
        { event_type: (src && src.event_type) || null, surface: "gaming" });
    } catch (e) {
      setRelLocal(before);
      window.track && window.track("error_shown", { context: "games_ack", message: e.message });
    }
  }

  // Acquitte d'abord les evenements de la licence, PUIS la passe en non
  // suivie — jamais l'inverse. Dans cet ordre, une defaillance partielle
  // (premiere ecriture OK, seconde en echec) laisse des evenements acquittes
  // sans plus d'effet qu'un clic "vu", et une licence toujours suivie que
  // l'utilisateur peut re-cliquer. Dans l'ordre inverse, une defaillance
  // partielle laisserait la licence non suivie en base alors que ses
  // evenements, jamais acquittes, continueraient de reapparaitre dans le
  // rail — un etat coince dont l'utilisateur ne peut ni sortir ni comprendre
  // l'origine.
  async function unwatchFranchise(it) {
    const before = releases;
    setRelLocal(before.map((r) => (r.franchise_id === it.franchiseId ? { ...r, acknowledged: true } : r)));
    try {
      await gmPatch("/rest/v1/game_releases?franchise_id=eq." + it.franchiseId + "&acknowledged=eq.false",
                    { acknowledged: true });
      await gmPatch("/rest/v1/game_franchises?id=eq." + it.franchiseId, { watched: false });
      window.track && window.track("games_unwatch_franchise", { franchise: it.franchiseId, surface: "gaming" });
    } catch (e) {
      setRelLocal(before);
      window.track && window.track("error_shown", { context: "games_unwatch", message: e.message });
    }
  }

  const lastGame = (D.in_progress && D.in_progress[0]) || null;
  const plat = (id) => (D.profiles || []).find((p) => p.id === id);
  const riot = plat("riot");
  const topGenre = (D.genres_30d && D.genres_30d[0]) || null;
  const heroEyebrowParts = [];
  const livePlatforms = (D.profiles || []).filter(p => !p._placeholder).map(p => p.platform.toLowerCase());
  if (livePlatforms.length) heroEyebrowParts.push(livePlatforms.join(" + "));
  if (D.totals && D.totals.hours_total) heroEyebrowParts.push(`${Math.round(D.totals.hours_total).toLocaleString("fr-FR")}h cumulées Steam`);

  return (
    <div className="gm-wrap" data-screen-label="Gaming">
      {/* ══ HERO ══ */}
      <header className="gm-hero">
        <div>
          <div className="gm-hero-eyebrow">
            {heroEyebrowParts.length ? heroEyebrowParts.join(" · ") : "gaming · en attente du prochain sync"}
          </div>
          <h1 className="gm-hero-title">
            <em>{(D.totals?.last30 || 0).toFixed(1)}h</em> sur 30 jours<br />
            — {D.totals?.games_played || 0} jeux lancés sur <em>{D.totals?.games_owned || 0}</em>, {D.totals?.backlog_count || 0} jamais ouverts.
          </h1>
          <p className="gm-hero-sub">
            {topGenre
              ? <>Genre dominant 14j : <strong>{topGenre.label}</strong> ({(topGenre.share * 100).toFixed(0)}%). </>
              : <>Pas d'activité Steam mesurable sur les 14 derniers jours. </>
            }
            {riot && riot.rank && riot.rank !== "—"
              ? <>TFT : <strong>{riot.rank}</strong> · {riot.lp} LP · {riot.games_season} matchs trackés. </>
              : null
            }
            Taux de complétion bibliothèque : {D.totals?.completion_rate || 0}%.
          </p>
        </div>

        <div className="gm-last">
          {lastGame ? (
            <>
              <div className="gm-last-cover" style={{ background: lastGame.cover }}>
                <div className="gm-last-platform">{lastGame.platform}</div>
                <div className="gm-last-cover-title">{lastGame.title}</div>
              </div>
              <div className="gm-last-meta">
                <div className="gm-last-label">dernière activité · {lastGame.last_session}</div>
                <div className="gm-last-title">{lastGame.title}</div>
                <div className="gm-last-sub">
                  {lastGame.played_h !== null && lastGame.played_h !== undefined ? <><strong>{lastGame.played_h}h</strong> all-time</> : null}
                  {lastGame.hltb_main ? <> · {lastGame.hltb_main}h HLTB</> : null}
                  {lastGame.progress_pct !== null && lastGame.progress_pct !== undefined ? <> · <strong>{(lastGame.progress_pct * 100).toFixed(0)}%</strong></> : null}
                  {lastGame.rank ? <> · <strong>{lastGame.rank}</strong></> : null}
                </div>
                <div className="gm-last-stats">
                  <span><strong>{lastGame.genre}</strong></span>
                  {lastGame.hltb_main && lastGame.played_h !== null
                    ? <span>reste <strong>{Math.max(0, lastGame.hltb_main - lastGame.played_h)}h</strong> estimées</span>
                    : <span>{lastGame.note || ""}</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="gm-last-meta" style={{ padding: 24, opacity: 0.6 }}>
              <div className="gm-last-label">aucune session récente</div>
              <div className="gm-last-title">—</div>
              <div className="gm-last-sub">Pas de jeu joué les 14 derniers jours.</div>
            </div>
          )}
        </div>
      </header>

      {/* ══ PROFILS PLATEFORMES ══ */}
      <div className="gm-profiles">
        {(D.profiles || []).map((p) => (
          <div className={`gm-profile ${p._placeholder ? "is-placeholder" : ""}`} key={p.id} style={p._placeholder ? { opacity: 0.45 } : null}>
            <div className="gm-profile-head">
              <div className="gm-profile-badge">
                <span className="gm-profile-dot" style={{ background: p.accent }}></span>
                <div>
                  <div className="gm-profile-name">{p.platform}</div>
                  <div className="gm-profile-handle">{p.handle}</div>
                </div>
              </div>
            </div>
            <div className="gm-profile-main">
              <span className="gm-profile-main-val">{(p.hours_total || 0).toLocaleString("fr-FR")}</span>
              <span className="gm-profile-main-unit">h</span>
            </div>
            <div className="gm-profile-sub">
              {p._placeholder ? (
                <em>pipeline non branché</em>
              ) : p.id === "riot" ? (
                <>
                  <strong>{p.rank || "—"}</strong>{p.lp ? <> · {p.lp} LP</> : null}<br />
                  {p.games_season || 0} matchs · W/L <strong>{(p.top4_rate * 100).toFixed(0)}%</strong>
                </>
              ) : (
                <>
                  <strong>{p.games_played || 0}</strong>/{p.games_owned || 0} jeux lancés<br />
                  {p.achievements ? <>{p.achievements.toLocaleString("fr-FR")} achievements</> :
                   p.trophies ? <>{p.trophies.platinum} platines · {p.trophies.gold} or</> : "—"}
                  {p.gamerscore ? <> · {p.gamerscore.toLocaleString("fr-FR")} gs</> : null}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ══ À VENIR ══ */}
      <section className="gm-section">
        <div className="gm-section-head">
          <h2 className="gm-section-title">À venir · <em>dans tes licences suivies</em></h2>
          <span className="gm-section-meta">{upcoming.length} annonce{upcoming.length > 1 ? "s" : ""}</span>
        </div>
        <GmUpcoming items={upcoming} onAck={ackRelease} onUnwatch={unwatchFranchise} />
      </section>

      {/* ══ MA BIBLIOTHÈQUE ══ */}
      <section className="gm-section">
        <div className="gm-section-head">
          <h2 className="gm-section-title">Ma bibliothèque</h2>
          <span className="gm-section-meta">{libraryView.length} jeu{libraryView.length > 1 ? "x" : ""}</span>
        </div>
        <div className="gm-lib-toolbar">
          <input className="gm-lib-search" type="search" placeholder="Chercher un jeu…"
                 value={libQuery} onChange={(e) => setLibQuery(e.target.value)} />
          <div className="gm-lib-chips">
            {GM_STATUS_ORDER.map((s) => (
              <button key={s}
                      className={`gm-lib-filter ${libStatuses.includes(s) ? "is-on" : ""}`}
                      onClick={() => toggleStatus(s)}>
                {window.gamesView.STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <select className="gm-lib-sort" value={libSort} onChange={(e) => setLibSort(e.target.value)}>
            <option value="hours">Heures jouées</option>
            <option value="recent">Joué récemment</option>
            <option value="name">Nom</option>
            <option value="rating">Ma note</option>
          </select>
        </div>
        <GmLibrary cards={libraryView} onOpen={setSheetCard} />
      </section>

      {/* ══ §1 EN COURS ══ */}
      <section className="gm-section">
        <div className="gm-section-head">
          <span className="gm-section-num">01</span>
          <h2 className="gm-section-title">En cours · <em>{(D.in_progress || []).length} jeux actifs</em></h2>
          <span className="gm-section-meta">heures jouées · dernière activité</span>
        </div>
        {(D.in_progress || []).length === 0 ? (
          <div className="gm-empty">Aucun jeu joué les 14 derniers jours sur Steam.</div>
        ) : (
        <div className="gm-ip-grid">
          {D.in_progress.map((g) => (
            <div className="gm-ip-card" key={g.title}>
              <div className="gm-ip-cover" style={{ background: g.cover }}>
                <div className="gm-ip-cover-plat">{g.platform}</div>
                <div className={`gm-ip-cover-status ${g.comfort ? "comfort" : g.status}`}>
                  {g.comfort ? "comfort" : g.status}
                </div>
              </div>
              <div className="gm-ip-body">
                <div className="gm-ip-head">
                  <div className="gm-ip-title">{g.title}</div>
                  <div className="gm-ip-genre">{g.genre}</div>
                </div>
                {g.ongoing ? (
                  <>
                    <div className="gm-ip-rank">
                      {g.rank}
                      {g.delta_lp_week ? <span className="gm-ip-rank-lp">+{g.delta_lp_week} LP · 7j</span> : null}
                    </div>
                    <div className="gm-ip-last">{g.last_session}</div>
                  </>
                ) : g.hltb_main && g.progress_pct !== null ? (
                  <>
                    <div className="gm-ip-progress">
                      <div className="gm-ip-progress-head">
                        <span><strong>{g.played_h}h</strong> / {g.hltb_main}h</span>
                        <span>{(g.progress_pct * 100).toFixed(0)}%</span>
                      </div>
                      <div className="gm-ip-bar"><div className="gm-ip-bar-fill" style={{ width: `${g.progress_pct * 100}%` }}></div></div>
                    </div>
                    <div className="gm-ip-last">{g.last_session}</div>
                  </>
                ) : (
                  <>
                    <div className="gm-ip-progress">
                      <div className="gm-ip-progress-head">
                        <span><strong>{g.played_h || 0}h</strong> all-time</span>
                        <span>{g.last_session}</span>
                      </div>
                    </div>
                  </>
                )}
                <div className="gm-ip-note">{g.note}</div>
              </div>
            </div>
          ))}
        </div>
        )}
      </section>

      {/* ══ §3 ACTIVITÉ ══ */}
      <section className="gm-section">
        <div className="gm-section-head">
          <span className="gm-section-num">03</span>
          <h2 className="gm-section-title">Temps de jeu · <em>tendance longue</em></h2>
          <span className="gm-section-meta">heures/jour · moyenne mobile 7j</span>
        </div>
        <div className="gm-chart-wrap" style={{ marginBottom: 20 }}>
          <div className="gm-chart-head">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--tx2)" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginRight: 6 }}></span>
              heures/jour
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", opacity: 0.3, margin: "0 6px 0 18px" }}></span>
              moyenne mobile 7j
            </div>
            <div className="mz-range">
              {["30j", "90j"].map((r) => (
                <button
                  key={r}
                  className={`mz-range-btn ${chartRange === r ? "is-active" : ""}`}
                  onClick={() => setChartRange(r)}
                >{r}</button>
              ))}
            </div>
          </div>
          {(D.daily_sessions || []).length > 0
            ? <GmActivityChart series={D.daily_sessions} range={chartRange} />
            : <div className="gm-empty">Pas de stats quotidiennes — pipeline trop récent.</div>}
        </div>
        {D.heatmap && Array.isArray(D.heatmap) ? (
          <div className="mz-heatmap">
            <div className="mz-heatmap-head">
              <div className="mz-heatmap-title">Heure × jour · moyenne 30j</div>
              <div className="mz-heatmap-legend">
                moins
                <div className="mz-heatmap-scale">
                  <span style={{ background: "var(--bd)" }}></span>
                  <span style={{ background: "color-mix(in srgb, var(--brand) 25%, transparent)" }}></span>
                  <span style={{ background: "color-mix(in srgb, var(--brand) 50%, transparent)" }}></span>
                  <span style={{ background: "color-mix(in srgb, var(--brand) 75%, transparent)" }}></span>
                  <span style={{ background: "var(--brand)" }}></span>
                </div>
                plus
              </div>
            </div>
            <GmHeatmap grid={D.heatmap} />
          </div>
        ) : null}
      </section>

      {/* ══ §4 GENRES ══ */}
      <section className="gm-section">
        <div className="gm-section-head">
          <span className="gm-section-num">04</span>
          <h2 className="gm-section-title">Genres · <em>répartition 14j</em></h2>
          <span className="gm-section-meta">basé sur playtime_2weeks Steam · {(D.genres_30d || []).reduce((a, g) => a + (g.hours || 0), 0)}h</span>
        </div>
        {(D.genres_30d || []).length === 0 ? (
          <div className="gm-empty">Pas assez de données enrichies (steam_game_details quasi vide).</div>
        ) : (
        <>
        <div className="gm-genre-bar">
          {D.genres_30d.map((g) => (
            <div
              key={g.label}
              className="gm-genre-bar-seg"
              style={{ flex: g.share, background: g.color }}
              title={`${g.label} · ${(g.share * 100).toFixed(0)}% · ${g.hours}h`}
            >
              {g.share > 0.06 ? `${(g.share * 100).toFixed(0)}%` : ""}
            </div>
          ))}
        </div>
        <div className="gm-genre-split">
          <div className="gm-genre-table">
            {D.genres_30d.map((g) => (
              <div className="gm-genre-row" key={g.label}>
                <div className="gm-genre-dot" style={{ background: g.color }}></div>
                <div className="gm-genre-label">{g.label}</div>
                <div className="gm-genre-share">{(g.share * 100).toFixed(0)}%</div>
                <div className="gm-genre-hrs">{g.hours}h</div>
              </div>
            ))}
          </div>
          <div>
            <p style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              fontStyle: "italic",
              color: "var(--tx2)",
              lineHeight: 1.55,
              textWrap: "pretty"
            }}>
              Répartition calculée depuis le temps de jeu Steam des 14 derniers jours,
              croisé avec le genre principal récupéré via la Store API.
              Les jeux non enrichis tombent dans "Autre".
            </p>
          </div>
        </div>
        </>
        )}
      </section>

      {/* ══ §7 ACHIEVEMENTS ══ */}
      <section className="gm-section">
        <div className="gm-section-head">
          <span className="gm-section-num">07</span>
          <h2 className="gm-section-title">Achievements · <em>derniers débloqués</em></h2>
          <span className="gm-section-meta">{(D.recent_achievements || []).length} affichés</span>
        </div>
        {(D.recent_achievements || []).length === 0 ? (
          <div className="gm-empty">Aucun achievement Steam tracké pour l'instant — phase D du pipeline ne déclenche que sur les jeux joués les 14 derniers jours.</div>
        ) : (
        <div className="gm-ach-list">
          {D.recent_achievements.map((a, i) => (
            <div className="gm-ach" key={i}>
              <div className={`gm-ach-ico ${a.type}`}>
                {a.type === "platinum" ? "PLT" :
                 a.type === "gold" ? "OR" :
                 a.type === "silver" ? "AG" :
                 a.type === "bronze" ? "BZ" :
                 a.type === "rank" ? "★" : "●"}
              </div>
              <div className="gm-ach-meta">
                <div className="gm-ach-label">{a.label}</div>
                <div className="gm-ach-game">{a.game} · {a.date}</div>
              </div>
              <div className="gm-ach-num">
                {a.rarity !== null && a.rarity !== undefined && (
                  <>
                    <strong>{a.rarity.toFixed(1)}%</strong><br />
                    des joueurs
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
      </section>

      {/* ══ §8 MILESTONES ══ */}
      <section className="gm-section">
        <div className="gm-section-head">
          <span className="gm-section-num">08</span>
          <h2 className="gm-section-title">Indicateurs · <em>tableau de bord</em></h2>
          <span className="gm-section-meta">depuis Steam + TFT</span>
        </div>
        <div className="gm-milestones">
          {(D.milestones || []).map((m) => (
            <div className="gm-milestone" key={m.label}>
              <div className="gm-milestone-label">{m.label}</div>
              <div className="gm-milestone-value">{m.value}</div>
              <div className="gm-milestone-sub">{m.sub}</div>
              {m.progress !== undefined && (
                <div className="gm-milestone-bar">
                  <div className="gm-milestone-bar-fill" style={{ width: `${(m.progress * 100).toFixed(0)}%` }}></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <GmSheet card={sheetCard}
               franchise={sheetCard ? franchisesById[sheetCard.franchiseId] : null}
               platforms={PLATFORMS}
               onClose={() => setSheetCard(null)}
               onStatus={(c, s) => writeProgress(c, { status: s })}
               onRating={(c, r) => writeProgress(c, { rating: r })}
               onPlatform={(c, p) => writeProgress(c, { platform: p })}
               onWatch={toggleWatch} />
    </div>
  );
}

window.PanelGaming = PanelGaming;
