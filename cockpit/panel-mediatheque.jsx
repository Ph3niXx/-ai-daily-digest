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

function MdtStepper({ entry, progressById, onProgress }) {
  const [editing, setEditing] = useMdtState(false);
  const watched = progressById.get(entry.id) || 0;
  const released = mdtReleased(entry);
  const max = released;                       // plafonné aux épisodes sortis
  const disabled = entry.airing_status === "NOT_YET_RELEASED" || max === 0;
  const clamp = (v) => Math.max(0, Math.min(max, v));
  // Dénominateur : pour une saison en diffusion on montre les épisodes SORTIS
  // à date (released), pas le total planifié — évite le « x/? » quand AniList
  // n'a pas encore renseigné episodes_total. Le total prévu reste en contexte.
  const total = entry.episodes_total;
  const countLabel =
    entry.airing_status === "RELEASING"
      ? (total != null && total > released ? `${watched}/${released} · ${total} prévus` : `${watched}/${released}`)
      : entry.airing_status === "NOT_YET_RELEASED"
        ? `${watched}/${total != null ? total : "—"}`
        : `${watched}/${total != null ? total : (released || "?")}`;
  return (
    <div className="mdt-stepper">
      <button disabled={disabled || watched <= 0} onClick={() => onProgress(entry, clamp(watched - 1))} aria-label="Un épisode de moins">−</button>
      <span className="mdt-stepper-count" onClick={() => !disabled && setEditing(true)}>
        {editing ? (
          <input
            autoFocus type="number" min="0" max={max} defaultValue={watched}
            onBlur={(e) => { setEditing(false); onProgress(entry, clamp(Number(e.target.value) || 0)); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditing(false); }}
          />
        ) : countLabel}
      </span>
      <button disabled={disabled || watched >= max} onClick={() => onProgress(entry, clamp(watched + 1))} aria-label="Un épisode de plus">+</button>
      <button disabled={disabled || watched >= max} className="mdt-chip" style={{ marginLeft: 4 }}
        onClick={() => onProgress(entry, max)} title="Marquer tous les épisodes sortis comme vus">✓ vue</button>
    </div>
  );
}

function FicheFranchise({ fiche, D, progressById, onClose, onAdd, onProgress, onRemove, onShelve }) {
  // Normalise les deux modes vers un shape commun d'affichage.
  let head, rows;
  if (fiche.mode === "preview") {
    if (fiche.loading) return (
      <div className="mdt-modal-backdrop" onClick={onClose}>
        <div className="mdt-modal" onClick={(e) => e.stopPropagation()}><div className="mdt-spinner">Construction de la fiche franchise…</div></div>
      </div>
    );
    const root = fiche.mediaById[fiche.built.root_id];
    head = {
      cover: root.coverImage && root.coverImage.large,
      title: (root.title && (root.title.english || root.title.romaji)) || "?",
      romaji: root.title && root.title.romaji, native: root.title && root.title.native,
      genres: (root.genres || []).join(" · "), synopsis: null,
    };
    rows = fiche.built.entries.map((e) => {
      const m = fiche.mediaById[e.source_id];
      return {
        key: e.source_id, in_main_chain: e.in_main_chain, kind: e.kind, season_number: e.season_number,
        title: (m.title && (m.title.english || m.title.romaji)) || "?",
        status: m.status, episodes_total: m.episodes != null ? m.episodes : (m.format === "MOVIE" ? 1 : null),
        start_date: window.anilist.fuzzyDate(m.startDate),
        next_episode_number: m.nextAiringEpisode && m.nextAiringEpisode.episode,
        next_episode_airing_at: m.nextAiringEpisode && m.nextAiringEpisode.airingAt ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() : null,
        entry: null,
      };
    });
  } else {
    const f = D.franchises.find((x) => x.id === fiche.franchiseId);
    if (!f) return null;
    const entries = D.entries.filter((e) => e.franchise_id === f.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    head = { cover: f.cover_url, title: f.title_english || f.title_romaji, romaji: f.title_romaji,
      native: f.title_native, genres: (f.genres || []).join(" · "), synopsis: f.synopsis, franchise: f };
    rows = entries.map((e) => ({
      key: e.id, in_main_chain: e.in_main_chain, kind: e.kind, season_number: e.season_number,
      title: e.title_english || e.title_romaji, status: e.airing_status, episodes_total: e.episodes_total,
      start_date: e.start_date, next_episode_number: e.next_episode_number,
      next_episode_airing_at: e.next_episode_airing_at, entry: e,
    }));
  }
  const chain = rows.filter((r) => r.in_main_chain);
  const bonus = rows.filter((r) => !r.in_main_chain);
  const rowLabel = (r) => r.kind === "season" ? `S${r.season_number}` : (r.kind === "movie" ? "Film" : r.kind.toUpperCase());
  const STATUS_FR = { FINISHED: "Terminée", RELEASING: "En diffusion", NOT_YET_RELEASED: "Annoncée", CANCELLED: "Annulée", HIATUS: "En pause" };

  return (
    <div className="mdt-modal-backdrop" onClick={onClose}>
      <div className="mdt-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="mdt-fiche-head">
          {head.cover ? <img className="mdt-fiche-cover" src={head.cover} alt="" /> : <div className="mdt-fiche-cover" />}
          <div className="mdt-fiche-titles">
            <h2>{head.title}</h2>
            <p className="mdt-fiche-native">{head.romaji}{head.native ? ` · ${head.native}` : ""}</p>
            <p className="mdt-fiche-meta">{head.genres}</p>
            {head.franchise && head.franchise.shelved &&
              <span className="mdt-badge mdt-badge--shelved" style={{ marginTop: 6, display: "inline-block" }}>Mis de côté</span>}
            {head.synopsis && <p className="mdt-fiche-synopsis">{head.synopsis}</p>}
          </div>
        </div>

        <div className="mdt-section-label">Saisons & films canon</div>
        {chain.map((r) => (
          <div key={r.key} className="mdt-entry">
            <div className="mdt-entry-info">
              <strong>{rowLabel(r)}</strong> · {r.title}
              <div className="mdt-entry-sub">
                {r.start_date ? r.start_date.slice(0, 4) : "date ?"} · {r.episodes_total != null ? `${r.episodes_total} ép.` : "ép. ?"} · {STATUS_FR[r.status] || r.status}
                {r.status === "RELEASING" && r.next_episode_number
                  ? ` · ép. ${r.next_episode_number} le ${mdtFmtDate(r.next_episode_airing_at)}` : ""}
              </div>
            </div>
            {r.entry && onProgress && <MdtStepper entry={r.entry} progressById={progressById} onProgress={onProgress} />}
          </div>
        ))}

        {bonus.length > 0 && <>
          <div className="mdt-section-label">Bonus (hors progression)</div>
          {bonus.map((r) => (
            <div key={r.key} className="mdt-entry">
              <div className="mdt-entry-info">
                <strong>{rowLabel(r)}</strong> · {r.title}
                <div className="mdt-entry-sub">{r.start_date ? r.start_date.slice(0, 4) : "date ?"} · {r.episodes_total != null ? `${r.episodes_total} ép.` : "ép. ?"}</div>
              </div>
              {r.entry && onProgress && <MdtStepper entry={r.entry} progressById={progressById} onProgress={onProgress} />}
            </div>
          ))}
        </>}

        <div className="mdt-fiche-actions">
          {fiche.mode === "preview"
            ? <button className="mdt-btn" onClick={onAdd}>+ Ajouter à ma bibliothèque</button>
            : <>
                {onShelve && <button className="mdt-btn mdt-btn--ghost" onClick={onShelve}>
                  {head.franchise && head.franchise.shelved ? "Réactiver" : "Mettre de côté"}</button>}
                <button className="mdt-btn mdt-btn--ghost" onClick={onRemove}>Retirer de ma bibliothèque</button>
              </>}
          <button className="mdt-btn mdt-btn--ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function MdtReleasesStrip({ D, tick, onAck }) {
  const events = D.releases.filter((r) => !r.acknowledged);
  const calendar = useMdtMemo(() => {
    const items = [];
    const now = Date.now();
    for (const e of D.entries) {
      if (e.airing_status === "RELEASING" && e.next_episode_airing_at) {
        items.push({ key: e.id, when: new Date(e.next_episode_airing_at).getTime(),
          label: e.title_english || e.title_romaji,
          detail: `ép. ${e.next_episode_number} · ${mdtFmtDate(e.next_episode_airing_at)}` });
      } else if (e.airing_status === "NOT_YET_RELEASED" && e.start_date && new Date(e.start_date).getTime() > now - 86400000) {
        items.push({ key: e.id, when: new Date(e.start_date).getTime(),
          label: e.title_english || e.title_romaji, detail: `première le ${mdtFmtDate(e.start_date)}` });
      }
    }
    return items.sort((a, b) => a.when - b.when).slice(0, 8);
  }, [D.entries, tick]);

  if (!events.length && !calendar.length) return null;
  return (
    <section className="mdt-releases" aria-label="Sorties">
      <div className="mdt-releases-head">Sorties de ta bibliothèque</div>
      {events.map((r) => (
        <div key={r.id} className="mdt-release">
          <span>🆕 {r.title}</span>
          <span className="mdt-release-date">{r.event_date ? mdtFmtDate(r.event_date) : mdtFmtDate(r.detected_at)}</span>
          <button className="mdt-release-ack" onClick={() => onAck(r)} title="Marquer comme vu" aria-label="Acquitter">✓</button>
        </div>
      ))}
      {calendar.length > 0 && (
        <div className="mdt-calendar">
          {calendar.map((c) => (
            <span key={c.key} className="mdt-calendar-item">📅 <strong>{c.label}</strong> — {c.detail}</span>
          ))}
        </div>
      )}
    </section>
  );
}

function PanelMediatheque({ data, onNavigate }) {
  const D = window.MEDIATHEQUE_DATA || { franchises: [], entries: [], progress: [], releases: [] };
  const [tick, setTick] = useMdtState(0);            // bump après mutation locale de D
  const [statusFilter, setStatusFilter] = useMdtState("all");
  const [sort, setSort] = useMdtState("activity");
  const [query, setQuery] = useMdtState("");          // >= 3 chars => recherche AniList (Task 8)
  const [view, setView] = useMdtState("library");     // "library" | "search" — bascule explicite recherche/bibliothèque
  const [fiche, setFiche] = useMdtState(null);        // {mode:"library"|"preview", ...} (Tasks 8-9)
  const searching = query.trim().length >= 3;
  const [results, setResults] = useMdtState(null);   // null = idle, [] = zéro résultat
  const [searchErr, setSearchErr] = useMdtState(null);
  const inSearchView = searching && view === "search"; // corps = résultats ; sinon = grille bibliothèque

  useMdtEffect(() => {
    if (!searching) { setResults(null); setSearchErr(null); setView("library"); return; }
    setView("search");            // taper (ou éditer la requête) ramène sur les résultats
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const media = await window.anilist.searchAnime(query.trim());
        if (cancelled) return;
        setResults(media);
        setSearchErr(null);
        window.track && window.track("mediatheque_search", { q_len: query.trim().length, results: media.length });
      } catch (e) {
        if (!cancelled) { setResults([]); setSearchErr("AniList ne répond pas — réessaie dans un instant."); }
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, searching]);

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

  const libSourceIds = useMdtMemo(() => new Set(D.entries.map((e) => e.source_id)), [D.entries, tick]);

  const cards = useMdtMemo(() => {
    return D.franchises.map((f) => {
      const entries = entriesByFranchise.get(f.id) || [];
      const chain = entries.filter((e) => e.in_main_chain);
      const derived = mdtStatus(chain, progressById);
      const st = f.shelved ? { ...derived, id: "shelved", label: "Mis de côté" } : derived;
      const lastTouch = Math.max(
        new Date(f.added_at || 0).getTime(),
        ...entries.map((e) => progressById.has(e.id) ? new Date(D.progress.find((p) => p.entry_id === e.id)?.updated_at || 0).getTime() : 0)
      );
      return { f, entries, st, lastTouch };
    });
  }, [D.franchises, entriesByFranchise, progressById, tick]);

  const visible = useMdtMemo(() => {
    let list = cards;
    if (statusFilter === "shelved") {
      list = list.filter((c) => c.f.shelved);
    } else {
      list = list.filter((c) => !c.f.shelved);   // "Tous" + buckets actifs excluent les mis de côté
      if (statusFilter === "to_watch") list = list.filter((c) => c.st.id === "to_watch");
      else if (statusFilter === "watching") list = list.filter((c) => c.st.id === "watching" || c.st.id === "up_to_date");
      else if (statusFilter === "seen") list = list.filter((c) => c.st.id === "seen");
    }
    const bySort = {
      activity: (a, b) => b.lastTouch - a.lastTouch,
      added: (a, b) => new Date(b.f.added_at || 0) - new Date(a.f.added_at || 0),
      alpha: (a, b) => (a.f.title_english || a.f.title_romaji || "").localeCompare(b.f.title_english || b.f.title_romaji || ""),
    };
    return [...list].sort(bySort[sort] || bySort.activity);
  }, [cards, statusFilter, sort]);

  async function openPreview(anchorId) {
    setFiche({ mode: "preview", loading: true });
    try {
      const { built, mediaById } = await window.anilist.fetchFranchiseLive(anchorId);
      const existing = D.franchises.find((f) => f.source_root_id === built.root_id);
      if (existing) { setFiche({ mode: "library", franchiseId: existing.id }); return; }
      setFiche({ mode: "preview", built, mediaById });
    } catch (e) {
      setFiche(null);
      window.cockpitToast && cockpitToast("Fiche AniList indisponible — réessaie.", { kind: "error" });
    }
  }

  async function addFranchise(built, mediaById) {
    const base = window.SUPABASE_URL + "/rest/v1/";
    const frRow = window.anilist.toFranchiseRow(built, mediaById);
    let created = null;
    try {
      const [fr] = await window.sb.postJSON(base + "media_franchises", frRow);
      created = fr;
      const entryRows = window.anilist.toEntryRows(built, mediaById).map((r) => ({ ...r, franchise_id: fr.id }));
      const savedEntries = await window.sb.postJSON(base + "media_entries", entryRows);
      window.MEDIATHEQUE_DATA.franchises.unshift(fr);
      window.MEDIATHEQUE_DATA.entries.push(...savedEntries);
      setTick((t) => t + 1);
      setFiche({ mode: "library", franchiseId: fr.id });
      window.track && window.track("mediatheque_add", { franchise_root_id: built.root_id, entries: savedEntries.length, source: "anilist" });
      cockpitToast(`${fr.title_english || fr.title_romaji} ajouté à ta bibliothèque.`, { kind: "success" });
    } catch (e) {
      if (created) { try { await window.sb.deleteRequest(base + "media_franchises?id=eq." + created.id); } catch (_) {} }
      cockpitToast("Échec de l'ajout — réessaie.", { kind: "error" });
    }
  }

  async function writeProgress(entry, value) {
    const D2 = window.MEDIATHEQUE_DATA;
    const prev = D2.progress.find((p) => p.entry_id === entry.id);
    const prevValue = prev ? prev.episodes_watched : null;
    // Optimiste : muter le global tout de suite.
    if (prev) prev.episodes_watched = value;
    else D2.progress.push({ entry_id: entry.id, episodes_watched: value, updated_at: new Date().toISOString() });
    setTick((t) => t + 1);
    try {
      const url = window.SUPABASE_URL + "/rest/v1/media_progress?on_conflict=entry_id";
      const res = await fetch(url, {
        method: "POST",
        headers: { ...window.sb.headers, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([{ entry_id: entry.id, episodes_watched: value, updated_at: new Date().toISOString() }]),
      });
      if (!res.ok) throw new Error("progress " + res.status);
      const released = mdtReleased(entry);
      window.track && window.track("mediatheque_progress", { entry_kind: entry.kind, delta: value - (prevValue || 0), completed: value >= released && released > 0 });
    } catch (e) {
      // Rollback.
      if (prevValue === null) { const i = D2.progress.findIndex((p) => p.entry_id === entry.id); if (i >= 0) D2.progress.splice(i, 1); }
      else { const p = D2.progress.find((x) => x.entry_id === entry.id); if (p) p.episodes_watched = prevValue; }
      setTick((t) => t + 1);
      cockpitToast("Progression non enregistrée — réessaie.", { kind: "error" });
    }
  }

  async function removeFranchise(franchiseId) {
    const f = D.franchises.find((x) => x.id === franchiseId);
    const ok = await cockpitConfirm(
      `Retirer « ${f ? (f.title_english || f.title_romaji) : "cette franchise"} » ? La progression sera supprimée.`,
      { danger: true });
    if (!ok) return;
    try {
      const res = await window.sb.deleteRequest(window.SUPABASE_URL + "/rest/v1/media_franchises?id=eq." + franchiseId);
      if (!res.ok) throw new Error("delete " + res.status);
      const D2 = window.MEDIATHEQUE_DATA;
      const entryIds = new Set(D2.entries.filter((e) => e.franchise_id === franchiseId).map((e) => e.id));
      D2.franchises = D2.franchises.filter((x) => x.id !== franchiseId);
      D2.entries = D2.entries.filter((e) => e.franchise_id !== franchiseId);
      D2.progress = D2.progress.filter((p) => !entryIds.has(p.entry_id));
      D2.releases = D2.releases.filter((r) => r.franchise_id !== franchiseId);
      setTick((t) => t + 1);
      setFiche(null);
      window.track && window.track("mediatheque_remove", { franchise_root_id: f ? f.source_root_id : null });
    } catch (e) {
      cockpitToast("Suppression impossible — réessaie.", { kind: "error" });
    }
  }

  async function toggleShelved(franchiseId) {
    const f = window.MEDIATHEQUE_DATA.franchises.find((x) => x.id === franchiseId);
    if (!f) return;
    const next = !f.shelved;
    f.shelved = next;                         // optimiste
    setTick((t) => t + 1);
    try {
      const res = await window.sb.patchJSON(
        window.SUPABASE_URL + "/rest/v1/media_franchises?id=eq." + franchiseId,
        { shelved: next });
      if (!res.ok) throw new Error("shelve " + res.status);
      window.track && window.track("mediatheque_shelve", { shelved: next, franchise_root_id: f.source_root_id });
    } catch (e) {
      f.shelved = !next;                      // rollback
      setTick((t) => t + 1);
      cockpitToast("Statut non enregistré — réessaie.", { kind: "error" });
    }
  }

  async function ackRelease(release) {
    release.acknowledged = true;            // optimiste
    setTick((t) => t + 1);
    try {
      const res = await window.sb.patchJSON(
        window.SUPABASE_URL + "/rest/v1/media_releases?id=eq." + release.id,
        { acknowledged: true });
      if (!res.ok) throw new Error("ack " + res.status);
      window.track && window.track("mediatheque_release_ack", { event_type: release.event_type });
    } catch (e) {
      release.acknowledged = false;
      setTick((t) => t + 1);
      cockpitToast("Acquittement non enregistré — réessaie.", { kind: "error" });
    }
  }

  return (
    <div className="panel-mediatheque">
      <div className="mdt-kicker">Personnel · anime</div>
      <h1 className="mdt-title">Médiathèque</h1>

      <MdtReleasesStrip D={D} tick={tick} onAck={ackRelease} />

      <div className="mdt-toolbar">
        <input
          className="mdt-search"
          type="search"
          placeholder="Rechercher un anime (AniList)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un anime"
        />
        {!inSearchView && (<>
          <div className="mdt-filters" role="group" aria-label="Filtrer par statut">
            {[["all", "Tous"], ["to_watch", "À voir"], ["watching", "En cours"], ["seen", "Vu"], ["shelved", "Mis de côté"]].map(([id, label]) => (
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

      {searching && (
        <div className="mdt-viewtoggle" role="group" aria-label="Basculer entre ma bibliothèque et les résultats de recherche">
          <button className={`mdt-viewtoggle-btn ${view === "library" ? "is-active" : ""}`}
            aria-pressed={view === "library"} onClick={() => setView("library")}>◀ Ma bibliothèque</button>
          <button className={`mdt-viewtoggle-btn ${view === "search" ? "is-active" : ""}`}
            aria-pressed={view === "search"} onClick={() => setView("search")}>
            Résultats « {query.trim()} »{results ? ` (${results.length})` : ""}
          </button>
        </div>
      )}

      {inSearchView ? (
        results === null ? <div className="mdt-spinner">Recherche…</div> :
        searchErr ? <div className="mdt-error">{searchErr}</div> :
        results.length === 0 ? <div className="mdt-empty">Aucun résultat pour « {query.trim()} ».</div> : (
          <div className="mdt-results">
            {results.map((m) => {
              const inLib = libSourceIds.has(m.id);
              return (
                <button key={m.id} className="mdt-result" onClick={() => openPreview(m.id)}>
                  {m.coverImage && m.coverImage.large ? <img src={m.coverImage.large} alt="" loading="lazy" /> : <div style={{ width: 56 }} />}
                  <div>
                    <p className="mdt-result-title">{(m.title && (m.title.english || m.title.romaji)) || "?"}</p>
                    <p className="mdt-result-sub">
                      {m.format || "?"} · {(m.startDate && m.startDate.year) || "?"}
                      {m.averageScore ? ` · ${m.averageScore}%` : ""}
                      {m.title && m.title.native ? ` · ${m.title.native}` : ""}
                    </p>
                    <p className="mdt-result-genres">{(m.genres || []).slice(0, 3).join(" · ")}</p>
                    {inLib && <span className="mdt-inlib">déjà dans ta bibliothèque</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )
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

      {fiche && (
        <FicheFranchise
          fiche={fiche} D={D} progressById={progressById}
          onClose={() => setFiche(null)}
          onAdd={fiche.mode === "preview" && fiche.built ? () => addFranchise(fiche.built, fiche.mediaById) : null}
          onProgress={fiche.mode === "library" ? writeProgress : null}
          onRemove={fiche.mode === "library" ? () => removeFranchise(fiche.franchiseId) : null}
          onShelve={fiche.mode === "library" ? () => toggleShelved(fiche.franchiseId) : null}
        />
      )}
    </div>
  );
}

window.PanelMediatheque = PanelMediatheque;
