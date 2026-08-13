// ═══════════════════════════════════════════════════════════════
// PANEL GAMING — cross-platform (Steam + PSN + Xbox + Riot)
// ─────────────────────────────────────────────
// Hero : last session + 4 plateformes
// §1 En cours — cards avec progression HLTB
// Ma bibliothèque — statuts déclarés (remplace backlog/abandonnés/top, lot 2)
// §3 Activité (courbe 90j)
// §4 Genres
// §7 Achievements récents
// §8 2026 milestones
// ═══════════════════════════════════════════════════════════════

const { useState: useGmState, useMemo: useGmMemo } = React;

const GM_STATUS_ORDER = ["playing", "wishlist", "finished", "dropped", "unqualified"];
// Meme vocabulaire que le selecteur de la fiche jeu (PLATFORMS), sans
// « Autre » : filtrer sur un fourre-tout n'aide personne a retrouver un jeu.
const GM_PLATFORM_ORDER = ["PC", "PlayStation", "Xbox", "Switch"];

// Palette §4 Genres — mêmes teintes que GENRE_PALETTE côté data-loader.js
// (transformGaming), réappliquée ici au calcul local genres14j.
const GM_GENRE_PALETTE = ["#3a1e2e", "#2a1e38", "#2a3d2e", "#3a2a1a", "#1a2a3a", "#2a1e2e", "#555"];

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
                       if (v === "") { onRating(card, null); return; }
                       const n = Number(v);
                       if (!Number.isFinite(n)) return;   // saisie invalide : on n'efface pas
                       onRating(card, Math.max(0, Math.min(100, n)));
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

// Recherche IGDB via l'Edge Function : le navigateur ne peut pas appeler
// IGDB directement (CORS + client secret). Le JWT de la session part dans
// l'en-tete, la fonction est deployee en verify_jwt.
async function gmSearchIgdb(q) {
  const r = await fetch(
    window.SUPABASE_URL + "/functions/v1/igdb-proxy?q=" + encodeURIComponent(q),
    { headers: window.sb.headers });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

// Ouvre la bibliothèque aux jeux console (PlayStation/Xbox/Switch) : seul
// Steam alimente le tracker automatiquement, ce composant couvre le reste.
function GmAddGame({ onAdded }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);
  // ID du jeu en cours d'ajout — desactive son bouton pendant l'appel pour
  // qu'un double-clic ne lance pas deux sequences d'ecriture concurrentes
  // (deux franchises/titres crees pour le meme jeu).
  const [addingId, setAddingId] = React.useState(null);

  async function run(e) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true); setErr(null);
    try {
      setRows(await gmSearchIgdb(q.trim()));
      window.track && window.track("games_search", {});
    } catch (ex) {
      setErr("La recherche n'a pas répondu. Réessaie.");
      window.track && window.track("error_shown", { context: "games_search", message: ex.message });
    } finally { setBusy(false); }
  }

  // onAdded (addConsoleGame) renvoie desormais { ok, message } au lieu
  // d'avaler l'echec : un conflit UNIQUE (jeu deja seede par le pipeline)
  // ou une ecriture partielle doivent rester visibles, pas silencieux.
  async function add(g) {
    if (addingId) return;
    setAddingId(g.id); setErr(null);
    try {
      const res = await onAdded(g);
      if (res && res.ok === false) setErr(res.message || "Ajout impossible.");
    } finally {
      setAddingId(null);
    }
  }

  if (!open) {
    return <button className="gm-add-open" onClick={() => setOpen(true)}>+ Ajouter un jeu console</button>;
  }
  return (
    <div className="gm-add">
      <form className="gm-add-form" onSubmit={run}>
        <input className="gm-lib-search" type="search" autoFocus placeholder="Titre du jeu…"
               value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="gm-sheet-btn" type="submit" disabled={busy}>{busy ? "…" : "Chercher"}</button>
        <button className="gm-sheet-btn" type="button" onClick={() => { setOpen(false); setRows([]); }}>Fermer</button>
      </form>
      {err && <div className="gm-empty">{err}</div>}
      <div className="gm-add-rows">
        {rows.map((g) => (
          <div className="gm-add-row" key={g.id}>
            {g.cover_url && <div className="gm-lib-cover" style={{ backgroundImage: `url("${g.cover_url}")` }} />}
            <div className="gm-add-body">
              <div className="gm-lib-name">{g.name}</div>
              <div className="gm-lib-hours">
                {g.release_human || "date inconnue"}
                {g.collection_name ? ` · ${g.collection_name}` : ""}
              </div>
            </div>
            <button className="gm-sheet-btn" disabled={addingId === g.id} onClick={() => add(g)}>
              {addingId === g.id ? "…" : "Ajouter"}
            </button>
          </div>
        ))}
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
  // Meme motif que relLocal/progLocal : l'ajout d'un jeu console pousse ici les
  // lignes que la base vient de rendre, pour que la carte apparaisse dans
  // l'instant. Sans ca il fallait recharger la page entiere — on perdait le
  // defilement, les filtres poses et la recherche en cours pour une ligne.
  const [titlesLocal, setTitlesLocal] = React.useState(null);
  const [franchisesLocal, setFranchisesLocal] = React.useState(null);
  const titles = titlesLocal || G.titles;
  const franchises = franchisesLocal || G.franchises;
  const titlesById = React.useMemo(
    () => Object.fromEntries((titles || []).map((t) => [t.id, t])), [titles]);
  const franchisesById = React.useMemo(
    () => Object.fromEntries((franchises || []).map((f) => [f.id, f])), [franchises]);
  const upcoming = React.useMemo(
    () => window.gamesView.buildUpcoming(releases, titlesById, franchisesById),
    [releases, titlesById, franchisesById]);

  const [libQuery, setLibQuery] = React.useState("");
  const [libStatuses, setLibStatuses] = React.useState([]);
  const [libPlatforms, setLibPlatforms] = React.useState([]);
  const [libSort, setLibSort] = React.useState("hours");
  const [progLocal, setProgLocal] = React.useState(null);
  const progressRows = progLocal || G.progress;

  const library = React.useMemo(
    () => window.gamesView.buildLibrary(titles, progressRows, (D && D._raw && D._raw.snapshot) || []),
    [titles, progressRows, D]);

  // Mesure d'exposition, emise une fois par montage du panel. C'est le
  // denominateur de games_status_set, sonde de survie du lot : sans lui,
  // « zero statut pose » ne distingue pas « il ouvre l'onglet et n'ecrit
  // rien » de « il n'ouvre jamais l'onglet ». Meme motif que jp_band_shown
  // pour la bande de vocabulaire japonais (docs/telemetry.md). Tableau de
  // dependances vide et intentionnel : on mesure l'ouverture de l'onglet,
  // pas chaque recalcul de library.
  React.useEffect(() => {
    window.track && window.track("games_library_shown", { count: library.length });
  }, []);

  // IGDB renseigne les genres de tous les titres, la ou steam_game_details
  // plafonne a 5 lignes sur 102 — c'est ce qui affichait « 100 % Autre ».
  const genres14j = React.useMemo(() => {
    const tally = new Map();
    for (const c of library) {
      if (!c.minutes2w) continue;
      const gs = (c.t.genres || []).length ? c.t.genres : ["Autre"];
      for (const g of gs) tally.set(g, (tally.get(g) || 0) + c.minutes2w / gs.length);
    }
    const total = [...tally.values()].reduce((a, b) => a + b, 0);
    return [...tally.entries()]
      .map(([name, min]) => ({ name, minutes: Math.round(min),
                               pct: total ? Math.round((min / total) * 100) : 0 }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [library]);

  // On stocke l'ID et non l'objet : les cartes sont reconstruites a chaque
  // ecriture (library est un useMemo sur progressRows), donc un objet capture
  // au clic serait perime des le premier statut pose — et le bloc note/
  // plateforme, conditionne au statut, ne se debloquerait jamais sans fermer
  // puis rouvrir la fiche.
  const [sheetTitleId, setSheetTitleId] = React.useState(null);
  const sheetCard = React.useMemo(
    () => (sheetTitleId ? library.find((c) => c.t.id === sheetTitleId) || null : null),
    [sheetTitleId, library]);
  const libraryView = React.useMemo(() => {
    const V = window.gamesView;
    return V.sortLibrary(
      V.filterByPlatform(V.filterByStatus(library, libStatuses), libPlatforms)
       .filter((c) => V.matchesQuery(c, libQuery)),
      libSort);
  }, [library, libStatuses, libPlatforms, libQuery, libSort]);

  function togglePlatform(p) {
    setLibPlatforms((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : cur.concat([p]));
  }

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
      gmInvalidateTracker();
    } catch (e) {
      setProgLocal(before);
      window.cockpitToast && window.cockpitToast("Impossible d'enregistrer — réessaie.", { kind: "error" });
      window.track && window.track("error_shown", { context: "games_progress", message: e.message });
    }
  }

  async function toggleWatch(franchiseId, watched) {
    try {
      await gmPatch("/rest/v1/game_franchises?id=eq." + franchiseId, { watched });
      window.track && window.track("games_watch_toggle", { watched });
      gmInvalidateTracker();
    } catch (e) {
      window.cockpitToast && window.cockpitToast("Suivi de licence non enregistré — réessaie.", { kind: "error" });
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

  // A appeler apres CHAQUE ecriture reussie du tracker.
  //
  // Le chargeur Tier 2 memoise la promesse de chaque table (once() dans
  // data-loader.js) : sans invalidation, G.progress et G.releases restent
  // indefiniment les tableaux charges a la toute premiere ouverture de
  // l'onglet. Or revenir sur l'onglet rappelle loadPanel("gaming"), ce qui
  // incremente dataVersion, change panelKey et REMONTE ce composant
  // (app.jsx) : progLocal et relLocal repartent a null, et les cartes
  // reaffichent l'etat d'avant l'ecriture. L'utilisateur qualifie dix jeux,
  // va au Brief, revient, et retrouve dix « Non qualifié » — l'onglet a
  // l'air d'oublier ce qu'on lui ecrit alors que la base, elle, a tout
  // enregistre. Invalider ici fait repartir le prochain loadPanel des
  // donnees reelles.
  //
  // invalidateCache(prefix) supprime toutes les cles commencant par le
  // prefixe (data-loader.js). « game_ » couvre les quatre tables du tracker
  // (game_titles, game_franchises, game_progress, game_releases) et, en
  // prime, game_releases_fresh — la requete Tier 1 de l'encart Jeux du
  // Brief. Sans effet dans la session courante (bootTier1 ne tourne qu'au
  // chargement de la page), et cohérent au rechargement suivant.
  //
  // addConsoleGame n'appelle PAS cette fonction : il invalide deja tout le
  // cache (invalidateCache() sans argument), qui est un sur-ensemble.
  function gmInvalidateTracker() {
    const dl = window.cockpitDataLoader;
    if (dl && dl.invalidateCache) dl.invalidateCache("game_");
  }

  // Un jeu console ajoute a la main : on cree sa franchise si sa collection
  // IGDB est inconnue, puis son titre, puis son statut. bootstrapped_at
  // reste NULL — seule la phase B du pipeline, qui parcourt reellement la
  // collection, a le droit de le poser.
  //
  // Ne doit plus jamais avaler un echec en silence : un conflit sur
  // game_titles.igdb_id (UNIQUE — jeu deja seede par le pipeline) ou sur
  // game_franchises.igdb_collection_id (UNIQUE) doit remonter a l'utilisateur,
  // pas seulement a la telemetrie. Renvoie { ok, message } — GmAddGame
  // affiche message dans son etat err existant.
  async function addConsoleGame(g) {
    let createdTitleId = null;
    try {
      let fr = (franchises || []).find(
        (f) => g.collection_id != null && f.igdb_collection_id === g.collection_id);
      if (!fr) {
        const created = await window.sb.postJSON(
          window.SUPABASE_URL + "/rest/v1/game_franchises",
          { igdb_collection_id: g.collection_id, name: g.collection_name || g.name, watched: true });
        fr = created[0];
        // Pousse des sa creation, pas a la fin : si la suite echoue, une
        // nouvelle tentative doit retrouver cette franchise plutot que d'en
        // recreer une et heurter le UNIQUE sur igdb_collection_id.
        setFranchisesLocal((franchises || []).concat([fr]));
      }
      const t = await window.sb.postJSON(
        window.SUPABASE_URL + "/rest/v1/game_titles",
        { franchise_id: fr.id, igdb_id: g.id, name: g.name, cover_url: g.cover_url,
          genres: g.genres, platforms: g.platforms,
          first_release_date: g.first_release_date, release_human: g.release_human });
      createdTitleId = t[0].id;
      await window.sb.postJSON(window.SUPABASE_URL + "/rest/v1/game_progress",
                               { title_id: t[0].id, status: "wishlist" });
      window.track && window.track("games_add", { igdb_id: g.id });
      // Insertion en place plutot qu'un rechargement de page : la base vient de
      // rendre les lignes creees (Prefer: return=representation), on les pousse
      // dans l'etat local et la carte apparait dans l'instant. gmInvalidateTracker
      // garantit qu'au prochain retour sur l'onglet la verite reviendra du serveur.
      setTitlesLocal((titles || []).concat([t[0]]));
      setProgLocal((progressRows || []).concat([{ title_id: t[0].id, status: "wishlist" }]));
      gmInvalidateTracker();
      return { ok: true };
    } catch (e) {
      // Le titre existe mais son statut n'a pas pu etre ecrit : sans ligne de
      // progression et sans steam_appid, buildLibrary l'exclut — il serait
      // invisible pour toujours tout en occupant son igdb_id, qui est UNIQUE.
      // On defait donc ce qu'on vient de creer plutot que de laisser une
      // impasse.
      if (createdTitleId) {
        try {
          await window.sb.deleteRequest(
            window.SUPABASE_URL + "/rest/v1/game_titles?id=eq." + createdTitleId);
        } catch (_) { /* best effort */ }
      }
      // Invalide le cache AVANT de renvoyer l'echec : une franchise a pu etre
      // creee avant l'echec : elle a ete poussee dans franchisesLocal des sa
      // creation, donc une nouvelle tentative dans cette session la retrouve.
      // L'invalidation couvre le cas ou l'utilisateur quitte l'onglet entre
      // les deux : la verite revient alors du serveur.
      gmInvalidateTracker();
      window.track && window.track("error_shown", { context: "games_add", message: e.message });
      return { ok: false, message: "Ajout impossible — ce jeu est peut-être déjà dans ta bibliothèque." };
    }
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
      gmInvalidateTracker();
    } catch (e) {
      setRelLocal(before);
      window.cockpitToast && window.cockpitToast("Impossible d'acquitter — réessaie.", { kind: "error" });
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
      gmInvalidateTracker();
    } catch (e) {
      setRelLocal(before);
      window.cockpitToast && window.cockpitToast("Impossible de retirer la licence — réessaie.", { kind: "error" });
      window.track && window.track("error_shown", { context: "games_unwatch", message: e.message });
    }
  }

  const lastGame = (D.in_progress && D.in_progress[0]) || null;
  const plat = (id) => (D.profiles || []).find((p) => p.id === id);
  const riot = plat("riot");
  // Le hero lit genres14j — la meme source que la §4 Genres (bibliotheque x
  // genres IGDB de game_titles) — et non D.genres_30d, calcule depuis
  // steam_game_details, enrichie a 5 lignes sur 102. Avec cette derniere, la
  // premiere ligne lue de l'onglet annoncait « Genre dominant 14 j :
  // Occasionnel (100 %) » trois ecrans au-dessus d'une §4 qui disait « Rien
  // joué ces 14 derniers jours. ». La branche « pas d'activite Steam
  // mesurable » ci-dessous dit desormais la meme chose que la §4.
  const topGenre = genres14j[0] || null;
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
              ? <>Genre dominant 14j : <strong>{topGenre.name}</strong> ({topGenre.pct}%). </>
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
          {/* Plateforme = ou le jeu est POSSEDE (declaration en fiche, ou
              appartenance Steam a defaut), jamais ou il sort. */}
          <div className="gm-lib-chips">
            {GM_PLATFORM_ORDER.map((p) => (
              <button key={p}
                      className={`gm-lib-filter ${libPlatforms.includes(p) ? "is-on" : ""}`}
                      onClick={() => togglePlatform(p)}>
                {p}
              </button>
            ))}
          </div>
          <select className="gm-lib-sort" value={libSort} onChange={(e) => setLibSort(e.target.value)}>
            <option value="hours">Heures jouées</option>
            <option value="recent">Joué récemment</option>
            <option value="name">Nom</option>
            <option value="rating">Ma note</option>
          </select>
          <GmAddGame onAdded={addConsoleGame} />
        </div>
        <GmLibrary cards={libraryView} onOpen={(c) => setSheetTitleId(c.t.id)} />
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
      </section>

      {/* ══ §4 GENRES ══ */}
      <section className="gm-section">
        <div className="gm-section-head">
          <span className="gm-section-num">04</span>
          <h2 className="gm-section-title">Genres · <em>répartition 14j</em></h2>
          <span className="gm-section-meta">basé sur playtime_2weeks Steam · {Math.round(genres14j.reduce((a, g) => a + g.minutes, 0) / 60)}h</span>
        </div>
        {genres14j.length === 0 ? (
          <div className="gm-empty">Rien joué ces 14 derniers jours.</div>
        ) : (
        <>
        <div className="gm-genre-bar">
          {genres14j.map((g, i) => (
            <div
              key={g.name}
              className="gm-genre-bar-seg"
              style={{ flex: g.pct, background: GM_GENRE_PALETTE[i % GM_GENRE_PALETTE.length] }}
              title={`${g.name} · ${g.pct}% · ${Math.round(g.minutes / 60)}h`}
            >
              {g.pct > 6 ? `${g.pct}%` : ""}
            </div>
          ))}
        </div>
        <div className="gm-genre-split">
          <div className="gm-genre-table">
            {genres14j.map((g, i) => (
              <div className="gm-genre-row" key={g.name}>
                <div className="gm-genre-dot" style={{ background: GM_GENRE_PALETTE[i % GM_GENRE_PALETTE.length] }}></div>
                <div className="gm-genre-label">{g.name}</div>
                <div className="gm-genre-share">{g.pct}%</div>
                <div className="gm-genre-hrs">{Math.round(g.minutes / 60)}h</div>
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
              pondérée par les genres IGDB de chaque titre de ta bibliothèque. Un jeu
              multi-genres partage ses minutes entre eux ; à défaut de genre connu, il
              tombe dans « Autre ».
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
               onClose={() => setSheetTitleId(null)}
               onStatus={(c, s) => writeProgress(c, { status: s })}
               onRating={(c, r) => writeProgress(c, { rating: r })}
               onPlatform={(c, p) => writeProgress(c, { platform: p })}
               onWatch={toggleWatch} />
    </div>
  );
}

window.PanelGaming = PanelGaming;
