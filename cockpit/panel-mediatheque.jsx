// ═══════════════════════════════════════════════════════════════
// PANEL MÉDIATHÈQUE — tracker anime (v1)
// ─────────────────────────────────────────────
// Bandeau Sorties (Task 10) · Bibliothèque (cartes franchise, statuts
// dérivés) · Recherche AniList + fiche préversion/ajout (Task 8) ·
// Fiche bibliothèque + progression (Task 9).
// Données : window.MEDIATHEQUE_DATA (T2 brut) — statuts calculés ici.
// Spec : docs/superpowers/specs/2026-07-14-mediatheque-anime-tracker-design.md
// ═══════════════════════════════════════════════════════════════

const { useState: useMdtState, useMemo: useMdtMemo, useEffect: useMdtEffect } = React;

// ── Statuts dérivés (entrées in_main_chain uniquement) ─────────
function mdtReleased(e) {
  if (e.airing_status === "FINISHED" || e.airing_status === "CANCELLED") return e.episodes_total || 0;
  if (e.airing_status === "RELEASING") return Math.max(0, (e.next_episode_number || 1) - 1);
  return 0;
}

function mdtStatus(chainEntries, progressById) {
  const watched = chainEntries.reduce((s, e) => s + (progressById.get(e.id) || 0), 0);
  const released = chainEntries.reduce((s, e) => s + mdtReleased(e), 0);
  const allFinished = chainEntries.every((e) => e.airing_status === "FINISHED" || e.airing_status === "CANCELLED");
  if (watched === 0) return { id: "to_watch", label: "À voir", watched, released };
  if (watched < released) return { id: "watching", label: "En cours", watched, released };
  return allFinished
    ? { id: "seen", label: "Vu", watched, released }
    : { id: "up_to_date", label: "En cours · à jour", watched, released };
}

function mdtFmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

function PanelMediatheque({ data, onNavigate }) {
  const D = window.MEDIATHEQUE_DATA || { franchises: [], entries: [], progress: [], releases: [] };
  const [tick, setTick] = useMdtState(0);            // bump après mutation locale de D
  const [statusFilter, setStatusFilter] = useMdtState("all");
  const [sort, setSort] = useMdtState("activity");
  const [query, setQuery] = useMdtState("");          // >= 3 chars => vue recherche (Task 8)
  const [fiche, setFiche] = useMdtState(null);        // {mode:"library"|"preview", ...} (Tasks 8-9)

  const entriesByFranchise = useMdtMemo(() => {
    const map = new Map();
    for (const e of D.entries) {
      if (!map.has(e.franchise_id)) map.set(e.franchise_id, []);
      map.get(e.franchise_id).push(e);
    }
    for (const list of map.values()) list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return map;
  }, [D.entries, tick]);

  const progressById = useMdtMemo(() => {
    const map = new Map();
    for (const p of D.progress) map.set(p.entry_id, p.episodes_watched || 0);
    return map;
  }, [D.progress, tick]);

  const cards = useMdtMemo(() => {
    return D.franchises.map((f) => {
      const entries = entriesByFranchise.get(f.id) || [];
      const chain = entries.filter((e) => e.in_main_chain);
      const st = mdtStatus(chain, progressById);
      const lastTouch = Math.max(
        new Date(f.added_at || 0).getTime(),
        ...entries.map((e) => progressById.has(e.id) ? new Date(D.progress.find((p) => p.entry_id === e.id)?.updated_at || 0).getTime() : 0)
      );
      return { f, entries, st, lastTouch };
    });
  }, [D.franchises, entriesByFranchise, progressById, tick]);

  const visible = useMdtMemo(() => {
    let list = cards;
    if (statusFilter === "to_watch") list = list.filter((c) => c.st.id === "to_watch");
    else if (statusFilter === "watching") list = list.filter((c) => c.st.id === "watching" || c.st.id === "up_to_date");
    else if (statusFilter === "seen") list = list.filter((c) => c.st.id === "seen");
    const bySort = {
      activity: (a, b) => b.lastTouch - a.lastTouch,
      added: (a, b) => new Date(b.f.added_at || 0) - new Date(a.f.added_at || 0),
      alpha: (a, b) => (a.f.title_english || a.f.title_romaji || "").localeCompare(b.f.title_english || b.f.title_romaji || ""),
    };
    return [...list].sort(bySort[sort] || bySort.activity);
  }, [cards, statusFilter, sort]);

  const searching = query.trim().length >= 3;

  return (
    <div className="panel-mediatheque">
      <div className="mdt-kicker">Personnel · anime</div>
      <h1 className="mdt-title">Médiathèque</h1>

      {/* Bandeau Sorties — rempli en Task 10 */}

      <div className="mdt-toolbar">
        <input
          className="mdt-search"
          type="search"
          placeholder="Rechercher un anime (AniList)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un anime"
        />
        {!searching && (<>
          <div className="mdt-filters" role="group" aria-label="Filtrer par statut">
            {[["all", "Tous"], ["to_watch", "À voir"], ["watching", "En cours"], ["seen", "Vu"]].map(([id, label]) => (
              <button key={id} className={`mdt-chip ${statusFilter === id ? "is-active" : ""}`}
                onClick={() => setStatusFilter(id)}>{label}</button>
            ))}
          </div>
          <select className="mdt-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier">
            <option value="activity">Dernière activité</option>
            <option value="added">Date d'ajout</option>
            <option value="alpha">Alphabétique</option>
          </select>
        </>)}
      </div>

      {searching ? (
        <div className="mdt-empty">Recherche branchée en Task 8.</div>
      ) : visible.length === 0 ? (
        <div className="mdt-empty">
          {D.franchises.length === 0
            ? "Ta bibliothèque est vide — cherche un anime ci-dessus pour commencer."
            : "Aucune franchise ne correspond à ce filtre."}
        </div>
      ) : (
        <div className="mdt-grid">
          {visible.map(({ f, entries, st }) => (
            <button key={f.id} className="mdt-card" onClick={() => setFiche({ mode: "library", franchiseId: f.id })}>
              {f.cover_url
                ? <img className="mdt-card-cover" src={f.cover_url} alt="" loading="lazy" />
                : <div className="mdt-card-cover" />}
              <div className="mdt-card-body">
                <p className="mdt-card-title">{f.title_english || f.title_romaji}</p>
                <p className="mdt-card-sub">{f.title_romaji}</p>
                <span className={`mdt-badge mdt-badge--${st.id}`}>{st.label}</span>
                <div className="mdt-progressbar" aria-hidden="true">
                  <div style={{ width: (st.released ? Math.min(100, Math.round(100 * st.watched / st.released)) : 0) + "%" }} />
                </div>
                <div className="mdt-card-count">{st.watched}/{st.released || "?"} ép. · {entries.filter((e) => e.in_main_chain).length} entrées</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Fiche franchise (modale) — Tasks 8-9 */}
    </div>
  );
}

window.PanelMediatheque = PanelMediatheque;
