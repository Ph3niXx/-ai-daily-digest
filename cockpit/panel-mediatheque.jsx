// ═══════════════════════════════════════════════════════════════
// PANEL MÉDIATHÈQUE — tracker anime / séries / films
// ─────────────────────────────────────────────
// Bandeau Sorties (Task 10) · Bibliothèque (cartes franchise, statuts
// dérivés) · Recherche AniList + TMDB, fiche préversion/ajout (Task 8) ·
// Fiche bibliothèque + progression (Task 9).
//
// DEUX ÉTAGES DE PORTÉE, et l'ordre de rendu est ce qui les distingue (ADR-42) :
// au-dessus des onglets, ce qui regarde toute la bibliothèque (bandeau Sorties,
// bande « Ce soir ») ; en dessous, ce qui appartient au rayon ouvert (hero,
// rail, agenda, collection). Avant de déplacer un bloc dans ce fichier, se
// demander à quel étage il appartient — un composant qui change de côté change
// de sens.
// Données : window.MEDIATHEQUE_DATA (T2 brut) — statuts dérivés et libellés
// calculés par cockpit/lib/mediatheque-view.js (window.mdtView).
// Spec : docs/superpowers/specs/2026-07-14-mediatheque-anime-tracker-design.md
// ═══════════════════════════════════════════════════════════════

const { useState: useMdtState, useMemo: useMdtMemo, useEffect: useMdtEffect, useRef: useMdtRef } = React;

// ── Délégués vers la logique pure ──────────────────────────────
// Source de vérité : cockpit/lib/mediatheque-view.js (testé sous node par
// tests/test_mediatheque_view.mjs). Rien de contractuel ne se calcule ici :
// statuts dérivés, saison courante, libellés et règle du hero y vivent, sinon
// ils dérivent sans qu'aucun test ne le voie. Ces délégués d'une ligne gardent
// les sites d'appel courts (`mdtStatus(chain, progressById)`).
function mdtReleased(e) { return window.mdtView.released(e); }
function mdtStatus(chainEntries, progressById) { return window.mdtView.status(chainEntries, progressById); }
function currentEntryOf(entries, progressById) { return window.mdtView.currentEntryOf(entries, progressById); }
function mdtCurLabel(cur, progressById) { return window.mdtView.curLabel(cur, progressById); }
function nextAiringOf(card) { return window.mdtView.nextAiringOf(card); }
function pickHero(cards) { return window.mdtView.pickHero(cards); }

// ── Budget « Ce soir » ─────────────────────────────────────────
// Daté du jour de DÉBUT de session, pas du jour calendaire : entre minuit et
// 2 h on est encore dans la soirée de la veille. Sans ça, choisir « 2 h+ » à
// 23 h 50 se réinitialiserait dix minutes plus tard, en plein film.
const MDT_BUDGET_KEY = "mdt.tonightBudget";

function mdtSessionDay(nowMs) {
  const d = new Date(nowMs);
  if (d.getHours() < 2) d.setDate(d.getDate() - 1);
  // Date locale, pas toISOString() : celui-ci convertit en UTC et ferait
  // basculer la clé d'un jour dans les fuseaux à l'est de Greenwich.
  const p2 = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

function mdtReadBudget(nowMs) {
  try {
    const raw = JSON.parse(localStorage.getItem(MDT_BUDGET_KEY) || "null");
    if (raw && raw.d === mdtSessionDay(nowMs)) return raw.b;
  } catch (_) { /* clé corrompue : on repart du défaut */ }
  return 60;
}

function mdtWriteBudget(b, nowMs) {
  try { localStorage.setItem(MDT_BUDGET_KEY, JSON.stringify({ d: mdtSessionDay(nowMs), b })); }
  catch (_) { /* quota plein : le budget vit alors le temps du rendu */ }
}

// kicker + libellé du CTA primaire + affichage du bouton +1 selon le cas.
function heroCopy(kind) {
  switch (kind) {
    case "resume":   return { kicker: "Reprendre", cta: "▶ Reprendre", quick: true };
    case "next_ep":  return { kicker: "Prochain épisode", cta: "Voir la fiche", quick: false };
    case "discover": return { kicker: "À découvrir", cta: "▶ Commencer", quick: false };
    case "seen":     return { kicker: "Déjà vu", cta: "Revoir la fiche", quick: false };
    default:         return { kicker: "", cta: "Voir la fiche", quick: false };
  }
}

function mdtFmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

// Date courte pour l'agenda (« 7 août ») : dans un horizon de 90 jours l'année
// n'apporte rien et alourdit une ligne déjà dense. On ne la remet que si elle
// diffère de l'année courante — fin décembre, « 5 janv. 2027 » reste utile.
function mdtFmtShort(ms) {
  const d = new Date(ms);
  const opts = { day: "numeric", month: "short" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("fr-FR", opts);
}

function MdtStepper({ entry, progressById, onProgress }) {
  const [editing, setEditing] = useMdtState(false);
  const watched = progressById.get(entry.id) || 0;
  const released = mdtReleased(entry);
  // Un manga dont AniList ne connaît pas encore le nombre de tomes donnerait
  // max=0, donc un stepper désactivé sur une série qu'on est en train de lire.
  // On le déplafonne plutôt que de le condamner.
  const uncapped = entry.kind === "manga" && entry.episodes_total == null;
  const max = released;
  const disabled = entry.airing_status === "NOT_YET_RELEASED" || (max === 0 && !uncapped);
  const clamp = (v) => (uncapped ? Math.max(0, v) : Math.max(0, Math.min(max, v)));
  // Dénominateur : pour une saison en diffusion on montre les épisodes SORTIS
  // à date (released), pas le total planifié — évite le « x/? » quand AniList
  // n'a pas encore renseigné episodes_total. Le total prévu reste en contexte.
  const total = entry.episodes_total;
  const countLabel =
    entry.kind === "manga"
      ? `${watched}/${total != null ? total : "?"}`
      : entry.airing_status === "RELEASING"
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
            autoFocus type="number" inputMode="numeric" min="0" max={max} defaultValue={watched}
            onBlur={(e) => { setEditing(false); onProgress(entry, clamp(Number(e.target.value) || 0)); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditing(false); }}
          />
        ) : countLabel}
      </span>
      <button disabled={disabled || (!uncapped && watched >= max)} onClick={() => onProgress(entry, clamp(watched + 1))} aria-label="Un épisode de plus">+</button>
      <button disabled={disabled || watched >= max} className="mdt-chip" style={{ marginLeft: 4 }}
        onClick={() => onProgress(entry, max)} title="Marquer tous les épisodes sortis comme vus">✓ vue</button>
    </div>
  );
}

function MdtRating({ entry, ratingById, onRating }) {
  const [editing, setEditing] = useMdtState(false);
  const rating = ratingById.get(entry.id);
  const clamp = (v) => Math.max(0, Math.min(100, v));
  if (editing) {
    return (
      <span className="mdt-rating">
        <input
          autoFocus type="number" inputMode="numeric" min="0" max="100"
          defaultValue={rating != null ? rating : ""}
          onBlur={(e) => {
            setEditing(false);
            const raw = e.target.value.trim();
            onRating(entry, raw === "" ? null : clamp(Number(raw) || 0));
          }}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditing(false); }}
        />
      </span>
    );
  }
  return (
    <span className="mdt-rating">
      <button className={`mdt-rating-pill ${rating != null ? "is-rated" : ""}`}
        onClick={() => setEditing(true)} title="Noter (0–100)">
        {rating != null ? rating : "Noter"}
      </button>
    </span>
  );
}

function FicheFranchise({ fiche, D, progressById, ratingById, onClose, onAdd, onProgress, onRemove, onShelve, onRating }) {
  // Normalise les deux modes vers un shape commun d'affichage.
  let head, rows;
  if (fiche.mode === "preview") {
    if (fiche.loading) return (
      <div className="mdt-modal-backdrop" onClick={onClose}>
        <div className="mdt-modal" onClick={(e) => e.stopPropagation()}>
          <button className="mdt-fiche-close" onClick={onClose} aria-label="Fermer la fiche">✕</button>
          <div className="mdt-spinner">Construction de la fiche franchise…</div>
        </div>
      </div>
    );
    if (fiche.src === "tmdb") {
      // On réutilise les mappers, qui produisent déjà le vocabulaire commun :
      // la fiche n'a jamais à connaître la forme brute de l'API TMDB, et ce
      // qu'elle montre en prévisualisation est exactement ce qui sera écrit.
      const fr = window.tmdb.toFranchiseRow(fiche.detail, fiche.kind);
      head = {
        cover: fr.cover_url, banner: fr.banner_url || fr.cover_url || null,
        title: fr.title_english || "?", romaji: null, native: fr.title_native,
        genres: (fr.genres || []).join(" · "), synopsis: fr.synopsis,
      };
      rows = window.tmdb.toEntryRows(fiche.detail, fiche.kind).map((e) => ({
        key: e.source_id, in_main_chain: e.in_main_chain, kind: e.kind,
        season_number: e.season_number, title: e.title_english,
        status: e.airing_status, episodes_total: e.episodes_total,
        start_date: e.start_date, next_episode_number: e.next_episode_number,
        next_episode_airing_at: e.next_episode_airing_at, entry: null,
      }));
    } else {
      const root = fiche.mediaById[fiche.built.root_id];
      head = {
        cover: root.coverImage && root.coverImage.large,
        banner: root.bannerImage || (root.coverImage && root.coverImage.large) || null,
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
    }
  } else {
    const f = D.franchises.find((x) => x.id === fiche.franchiseId);
    if (!f) return null;
    const entries = D.entries.filter((e) => e.franchise_id === f.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    head = { cover: f.cover_url, banner: f.banner_url || f.cover_url || null, title: f.title_english || f.title_romaji, romaji: f.title_romaji,
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
        <button className="mdt-fiche-close" onClick={onClose} aria-label="Fermer la fiche">✕</button>
        <div className="mdt-fiche-head" style={head.banner ? { backgroundImage: `url(${head.banner})` } : undefined}>
          <div className="mdt-fiche-scrim" />
          <div className="mdt-fiche-head-inner">
            <h2>{head.title}</h2>
            <p className="mdt-fiche-native">{head.romaji}{head.native ? ` · ${head.native}` : ""}</p>
            <p className="mdt-fiche-meta">{head.genres}</p>
            {head.franchise && head.franchise.shelved &&
              <span className="mdt-badge mdt-badge--shelved" style={{ marginTop: 6, display: "inline-block" }}>Mis de côté</span>}
          </div>
        </div>
        {head.synopsis && <p className="mdt-fiche-synopsis">{head.synopsis}</p>}

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
            {r.entry && onRating && <MdtRating entry={r.entry} ratingById={ratingById} onRating={onRating} />}
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
              {r.entry && onRating && <MdtRating entry={r.entry} ratingById={ratingById} onRating={onRating} />}
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

// Événements non acquittés uniquement — le calendrier des prochaines diffusions
// est passé dans <MdtWeek> (semainier).
function MdtReleasesStrip({ D, onAck }) {
  const events = D.releases.filter((r) => !r.acknowledged);
  if (!events.length) return null;
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
    </section>
  );
}

// Agenda des diffusions : une ligne par jour qui a quelque chose, jaquette à
// l'appui, jours creux repliés en une seule ligne. La grille de 7 colonnes
// qu'il remplace donnait le même poids visuel à un jour vide qu'à un jour
// chargé et laissait ~120 px de large à des titres de 40 caractères : il
// fallait lire chaque case pour savoir laquelle portait quelque chose.
function MdtWeek({ D, tick, section, onOpen }) {
  // Le filtre de section s'applique via la map de franchises : buildWeek écarte
  // déjà toute entrée dont la franchise est absente, on n'a donc pas à
  // dupliquer la règle côté logique pure.
  const franchiseById = useMdtMemo(
    () => new Map(D.franchises
      .filter((f) => window.mdtView.typeOf(f) === section)
      .map((f) => [f.id, f])),
    [D.franchises, section, tick]);
  const week = useMdtMemo(
    () => window.mdtView.buildWeek(D.entries, franchiseById, Date.now()),
    [D.entries, franchiseById, tick]);

  if (!week.count && !week.later.length) return null;

  // Repère relatif d'abord : « demain » se lit sans calcul mental, « dim. 26 » non.
  const relDay = (i) => (i === 0 ? "aujourd'hui" : i === 1 ? "demain" : null);
  const weekday = (ts) => new Date(ts).toLocaleDateString("fr-FR", { weekday: "short" });
  const dayNum = (ts) => new Date(ts).getDate();
  const quietLabel = (ts, i) =>
    relDay(i) || new Date(ts).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
  const timeLabel = (ts) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const open = (item) => {
    onOpen(item.franchiseId);
    mdtTrack("mediatheque_week_click", { days_ahead: item.daysAhead, entry_kind: item.kind });
  };
  const laterNote = (item) => {
    if (item.reason === "undated") return "date inconnue";
    if (item.reason === "premiere") return `première ${mdtFmtShort(item.at)}`;
    return `ép. ${item.ep || "?"} · ${mdtFmtShort(item.at)}`;
  };

  const withIndex = week.days.map((d, i) => ({ d, i }));
  const filled = withIndex.filter((x) => x.d.items.length);
  const quiet = withIndex.filter((x) => !x.d.items.length);

  return (
    <section className="mdt-section" aria-label="Cette semaine">
      <div className="mdt-section-head">
        <h3 className="mdt-section-title">Cette semaine</h3>
        {week.count > 0 && <span className="mdt-section-count">{week.count}</span>}
      </div>

      {filled.length > 0 && (
        <ol className="mdt-agenda">
          {filled.map(({ d, i }) => (
            <li key={d.ts} className={`mdt-agenda-day ${i === 0 ? "is-today" : ""}`}>
              <div className="mdt-agenda-date">
                <span className="mdt-agenda-wd">{relDay(i) || weekday(d.ts)}</span>
                <span className="mdt-agenda-num">{dayNum(d.ts)}</span>
              </div>
              <div className="mdt-agenda-items">
                {d.items.map((item) => (
                  <button key={item.entryId} className="mdt-agenda-item" onClick={() => open(item)}>
                    {item.cover
                      ? <img className="mdt-agenda-thumb" src={item.cover} alt="" loading="lazy" />
                      : <span className="mdt-agenda-thumb" />}
                    <span className="mdt-agenda-txt">
                      <span className="mdt-agenda-name">{item.label}</span>
                      <span className="mdt-agenda-ep">
                        {item.ep ? `ép. ${item.ep} · ${timeLabel(item.at)}` : "première"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      {filled.length === 0
        ? <p className="mdt-agenda-quiet mdt-agenda-quiet--all">Rien de prévu d'ici sept jours.</p>
        : quiet.length > 0 && (
          <p className="mdt-agenda-quiet">
            <span className="mdt-agenda-quiet-days">
              {quiet.map(({ d, i }) => (
                <span key={d.ts} className={i === 0 ? "is-today" : undefined}>{quietLabel(d.ts, i)}</span>
              ))}
            </span>
            {" — rien de prévu"}
          </p>
        )}

      {week.later.length > 0 && (
        <div className="mdt-week-later">
          <span className="mdt-week-later-lbl">plus tard</span>
          {week.later.map((item) => (
            <button key={item.entryId} className="mdt-later-pill" onClick={() => open(item)}>
              <strong>{item.label}</strong>
              <span>{laterNote(item)}</span>
            </button>
          ))}
          {week.laterTotal > week.later.length &&
            <span className="mdt-week-later-more">+{week.laterTotal - week.later.length}</span>}
        </div>
      )}
    </section>
  );
}

function MdtHero({ hero, progressById, onOpen, onProgress }) {
  if (!hero) {
    return (
      <section className="mdt-hero mdt-hero--empty">
        <div className="mdt-hero-inner">
          <div className="mdt-hero-kicker">Ta médiathèque</div>
          <h2 className="mdt-hero-title">Commence ta collection</h2>
          <p className="mdt-hero-meta">Cherche un anime ci-dessous pour l'ajouter à ta bibliothèque.</p>
        </div>
      </section>
    );
  }
  const { card, kind } = hero;
  const fr = card.f;
  const cur = currentEntryOf(card.entries, progressById);
  const st = card.st;
  const copy = heroCopy(kind);
  const nextAt = nextAiringOf(card);
  const meta = [
    mdtCurLabel(cur, progressById),
    st.id === "seen" ? "Terminé" : null,
    kind === "next_ep" && nextAt ? `nouvel ép. ${mdtFmtDate(new Date(nextAt).toISOString())}` : null,
  ].filter(Boolean).join(" · ");
  const pct = st.released ? Math.min(100, Math.round((100 * st.watched) / st.released)) : 0;
  const bg = fr.banner_url || fr.cover_url;
  const openFiche = () => {
    onOpen(fr);
    mdtTrack("mediatheque_hero_action", {
      action: kind === "resume" ? "resume" : kind === "discover" ? "start" : "open", status: st.id });
  };
  return (
    <section className="mdt-hero" style={bg ? { backgroundImage: `url(${bg})` } : undefined}>
      <div className="mdt-hero-scrim" />
      <div className="mdt-hero-inner">
        <div className="mdt-hero-kicker">{copy.kicker}</div>
        <h2 className="mdt-hero-title">{fr.title_english || fr.title_romaji}</h2>
        {meta && <p className="mdt-hero-meta">{meta}</p>}
        {st.watched > 0 && st.id !== "seen" && (
          <div className="mdt-hero-bar" aria-hidden="true"><div style={{ width: pct + "%" }} /></div>
        )}
        <div className="mdt-hero-actions">
          <button className="mdt-btn mdt-hero-cta" onClick={openFiche}>{copy.cta}</button>
          {copy.quick && cur && (
            <button className="mdt-btn mdt-btn--ghost mdt-hero-quick"
              onClick={() => onProgress(cur, Math.min(mdtReleased(cur), (progressById.get(cur.id) || 0) + 1))}>
              +1 épisode
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Bande « Ce soir » ──────────────────────────────────────────
// Remplace le hero de 18 h à 2 h. Trois propositions au plus, à rôles
// distincts — la sélection vit dans window.mdtView.pickTonight().
const MDT_BUDGETS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 h" },
  { value: null, label: "2 h+" },
];

const MDT_ROLE_LABEL = {
  fresh: "Ça vient de sortir",
  resume: "Reprendre",
  discover: "Sortir du lot",
};

// ── Sections ───────────────────────────────────────────────────
// Une section = un `media_type`, et cette table est la seule chose à toucher
// pour en ajouter une (manga, livre…). Elle a remplacé les chips de type
// multi-sélection : ceux-ci vivaient dans l'en-tête de « Ma collection » avec
// « Anime » seul coché par défaut, si bien que les séries et les films — déjà
// supportés de bout en bout depuis ADR-29 — n'étaient jamais visibles.
//
// `japanese` n'est pas un réglage esthétique : pipelines/jp_vocab_sync.py
// filtre `media_type == "anime"`, il n'existe aucun mot pour une franchise
// TMDB. La bande serait structurellement vide ailleurs.
const MDT_SECTION_KEY = "mdt.section";
const MDT_SECTIONS = [
  { id: "anime", label: "Anime",  kicker: "Personnel · anime",
    japanese: true,  emptyHint: "cherche un anime ci-dessus pour commencer",
    searchLabel: "Rechercher un anime" },
  { id: "tv",    label: "Séries", kicker: "Personnel · séries",
    japanese: false, emptyHint: "cherche une série ci-dessus pour commencer",
    searchLabel: "Rechercher une série" },
  { id: "movie", label: "Films",  kicker: "Personnel · films",
    japanese: false, emptyHint: "cherche un film ci-dessus pour commencer",
    searchLabel: "Rechercher un film" },
  { id: "manga", label: "Manga",  kicker: "Personnel · manga",
    japanese: false, emptyHint: "cherche un manga ci-dessus pour commencer",
    searchLabel: "Rechercher un manga" },
];
const MDT_SECTION_IDS = MDT_SECTIONS.map((s) => s.id);

function mdtSectionOf(id) {
  return MDT_SECTIONS.find((s) => s.id === id) || MDT_SECTIONS[0];
}

function mdtReadSection() {
  try {
    const raw = localStorage.getItem(MDT_SECTION_KEY);
    if (raw && MDT_SECTION_IDS.includes(raw)) return raw;
  } catch (_) { /* clé corrompue : on repart du défaut */ }
  return "anime";
}

// Le compteur sur l'onglet rend la section vide lisible AVANT le clic : sans
// lui, « Films » promet un rayon et livre un écran vide.
function MdtSectionTabs({ section, counts, onSelect }) {
  return (
    <div className="mdt-sections" role="tablist" aria-label="Sections de la médiathèque">
      {MDT_SECTIONS.map((s) => (
        <button key={s.id} role="tab" className={`mdt-section-tab ${section === s.id ? "is-active" : ""}`}
          aria-selected={section === s.id} onClick={() => onSelect(s.id)}>
          {s.label}
          <span className="mdt-section-tab-count">{counts[s.id] || 0}</span>
        </button>
      ))}
    </div>
  );
}

function mdtBudgetLabel(budget) {
  const b = MDT_BUDGETS.find((x) => x.value === budget);
  return b ? b.label : "1 h";
}

// ── Bande « Avant l'épisode » ──────────────────────────────────
// 2-3 mots japonais tirés du titre natif de la série qu'on s'apprête à
// lancer. Duolingo enseigne « le chat boit du lait », Anki fait tourner le
// deck qu'on lui donne : ni l'un ni l'autre ne sait qu'on va lancer 無職転生
// dans dix minutes. C'est le seul angle que le cockpit peut couvrir mieux.
//
// Aucune notion d'échéance, de série de jours ou de retard, VOLONTAIREMENT.
// Un tap marque « je connais » et le mot sort de la rotation ; ne rien taper
// n'accumule rien. Le mot revient quand la série revient, pas quand une file
// d'attente l'exige — c'est un backlog de 47 cartes en retard qui a tué la
// tentative précédente (app Atlas, une seule journée de pratique en 3 mois).
const MDT_JP_MAX = 3;

function MdtJapanese({ franchise, words, seenByWord, onMark }) {
  if (!franchise) return null;
  const mine = (words || []).filter((w) => w.franchise_id === franchise.id);
  if (!mine.length) return null;

  const isKnown = (w) => (seenByWord.get(w.word) || {}).status === "known";
  const fresh = mine.filter((w) => !isKnown(w));
  const shown = fresh.slice(0, MDT_JP_MAX);

  const title = franchise.title_romaji || franchise.title_english || franchise.title_native;

  // Tout connu : on le dit une fois, sobrement, plutôt que de faire
  // disparaître la bande — une UI qui s'évapore se lit comme un bug.
  if (!shown.length) {
    return (
      <section className="mdt-jp mdt-jp--done">
        <span className="mdt-jp-kicker">Avant l'épisode</span>
        <p className="mdt-jp-done-text">Tu connais déjà les mots de ce titre.</p>
      </section>
    );
  }

  return (
    <section className="mdt-jp">
      <header className="mdt-jp-head">
        <span className="mdt-jp-kicker">Avant l'épisode</span>
        <span className="mdt-jp-sub">{title}</span>
      </header>
      <ul className="mdt-jp-words">
        {shown.map((w) => (
          <li key={w.word} className="mdt-jp-word">
            <div className="mdt-jp-main">
              <span className="mdt-jp-kanji" lang="ja">{w.word}</span>
              {w.reading && <span className="mdt-jp-reading" lang="ja">{w.reading}</span>}
            </div>
            <div className="mdt-jp-gloss">
              {w.romaji && <em className="mdt-jp-romaji">{w.romaji}</em>}
              <span className="mdt-jp-meaning">{w.meaning_fr}</span>
            </div>
            <button type="button" className="mdt-jp-btn"
              onClick={() => onMark(w, "known")}
              aria-label={`Marquer ${w.word} comme connu`}>
              je connais
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MdtTonight({ picks, headline, budget, onBudget, progressById, onOpen, onProgress }) {
  return (
    <section className="mdt-tonight">
      <header className="mdt-tonight-head">
        <h2 className="mdt-tonight-title">{headline || "Ce soir"}</h2>
        <div className="mdt-tonight-budgets" role="group" aria-label="Temps disponible">
          {MDT_BUDGETS.map((b) => (
            <button key={String(b.value)} type="button"
              className={"mdt-budget" + (b.value === budget ? " is-active" : "")}
              aria-pressed={b.value === budget}
              onClick={() => onBudget(b.value)}>{b.label}</button>
          ))}
        </div>
      </header>

      {picks.length === 0 ? (
        <div className="mdt-tonight-empty">
          <p>Rien qui rentre dans {budget === null ? "ta soirée" : mdtBudgetLabel(budget)}.</p>
          {budget !== null && (
            <button type="button" className="mdt-tonight-widen" onClick={() => onBudget(null)}>
              Élargir à 2 h+
            </button>
          )}
        </div>
      ) : (
        <ul className="mdt-tonight-list">
          {picks.map((p) => {
            const watched = progressById.get(p.entry.id) || 0;
            const title = p.card.f.title_english || p.card.f.title_romaji || "?";
            return (
              <li key={p.role} className="mdt-tonight-card">
                <button type="button" className="mdt-tonight-cover"
                  onClick={() => onOpen(p.card.f)} aria-label={title}>
                  {p.card.f.cover_url
                    ? <img src={p.card.f.cover_url} alt="" loading="lazy" />
                    : <span className="mdt-tonight-nocover" aria-hidden="true" />}
                </button>
                <div className="mdt-tonight-meta">
                  <span className="mdt-tonight-role">{MDT_ROLE_LABEL[p.role]}</span>
                  <span className="mdt-tonight-name" title={title}>{title}</span>
                  <span className="mdt-tonight-sub">
                    {window.mdtView.nextEpLabel(p.entry, watched)}
                    {p.runtime != null ? ` · ${p.runtime} min` : ""}
                  </span>
                  <button type="button" className="mdt-tonight-cta"
                    onClick={() => {
                      mdtTrack("mediatheque_tonight_pick", {
                        role: p.role,
                        media_type: p.card.f.media_type || "anime",
                        runtime_minutes: p.runtime,
                        budget_min: budget,
                      });
                      onProgress(p.entry, watched + 1);
                    }}>
                    {p.role === "discover" ? "▶ Commencer" : "+1 épisode"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MdtRail({ cards, progressById, onOpen, onProgress }) {
  if (!cards.length) return null;
  return (
    <section className="mdt-section" aria-label="Continuer à regarder">
      <div className="mdt-section-head">
        <h3 className="mdt-section-title">Continuer à regarder</h3>
        <span className="mdt-section-count">{cards.length}</span>
      </div>
      <div className="mdt-rail">
        {cards.map(({ f, entries }) => {
          const cur = currentEntryOf(entries, progressById);
          const watched = cur ? (progressById.get(cur.id) || 0) : 0;
          const rel = cur ? mdtReleased(cur) : 0;
          const pct = rel ? Math.min(100, Math.round((100 * watched) / rel)) : 0;
          const shot = f.banner_url || f.cover_url;
          return (
            <div className="mdt-rail-card" key={f.id}>
              <button className="mdt-rail-shot" onClick={() => onOpen(f)}
                aria-label={`Ouvrir ${f.title_english || f.title_romaji}`}>
                {shot ? <img src={shot} alt="" loading="lazy" /> : <div className="mdt-rail-ph" />}
                <div className="mdt-rail-bar" aria-hidden="true"><div style={{ width: pct + "%" }} /></div>
              </button>
              <div className="mdt-rail-body">
                <p className="mdt-rail-title">{f.title_english || f.title_romaji}</p>
                <p className="mdt-rail-sub">{window.mdtView.nextEpLabel(cur, watched)}</p>
                {cur && (
                  <button className="mdt-chip mdt-rail-plus"
                    onClick={() => onProgress(cur, Math.min(rel, watched + 1))}>
                    +1 épisode
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MdtCard({ f, entries, st, cur, progressById, onOpen }) {
  const chainLen = entries.filter((e) => e.in_main_chain).length;
  const pct = st.released ? Math.min(100, Math.round((100 * st.watched) / st.released)) : 0;
  const showBar = st.watched > 0 && st.id !== "to_watch";
  const curLabel = mdtCurLabel(cur, progressById);
  return (
    <div className="mdt-card">
      <button className="mdt-card-poster" onClick={() => onOpen(f)}
        aria-label={`Ouvrir ${f.title_english || f.title_romaji}`}>
        {f.cover_url
          ? <img className="mdt-card-cover" src={f.cover_url} alt="" loading="lazy" />
          : <div className="mdt-card-cover" />}
        <span className={`mdt-card-badge mdt-badge--${st.id}`}>{st.label}</span>
        {showBar && (
          <div className="mdt-card-bar" aria-hidden="true"><div style={{ width: pct + "%" }} /></div>
        )}
      </button>
      <div className="mdt-card-meta">
        <p className="mdt-card-title">{f.title_english || f.title_romaji}</p>
        <p className="mdt-card-sub">{curLabel || st.label} · {chainLen} entrée{chainLen > 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

// Tout le rayon ouvert (actifs inclus) : c'est la seule vue exhaustive d'une
// section. Repliée par défaut — l'essentiel des franchises est « Vu » et
// n'appelle aucune action. `total` est borné à la SECTION : un « 12 / 47 » sur
// un rayon qui n'en contient que 12 se lirait comme un filtre actif.
// Les chips de type ont quitté cet en-tête pour devenir les onglets du panel
// (ADR-42) ; ne restent ici que le statut et le tri, qui sont propres au rayon.
function MdtCollection({ visible, total, open, onToggle, statusFilter, onStatusFilter,
                         sort, onSort, progressById, onOpen, queryActive, query, emptyHint }) {
  return (
    <section className="mdt-section" aria-label="Ma collection">
      <div className="mdt-section-head">
        <button className="mdt-collection-toggle" aria-expanded={open}
          onClick={onToggle} disabled={queryActive || total === 0}>
          <span className="mdt-chev" aria-hidden="true">▸</span>
          <span className="mdt-section-title">Ma collection</span>
          <span className="mdt-section-count">{visible.length}{visible.length !== total ? ` / ${total}` : ""}</span>
        </button>
        {open && !queryActive && (
          <div className="mdt-filters" role="group" aria-label="Filtrer par statut">
            {[["all", "Tous"], ["to_watch", "À voir"], ["watching", "En cours"], ["seen", "Vu"], ["shelved", "Mis de côté"]].map(([id, label]) => (
              <button key={id} className={`mdt-chip ${statusFilter === id ? "is-active" : ""}`}
                onClick={() => onStatusFilter(id)}>{label}</button>
            ))}
          </div>
        )}
        {open && (
          <select className="mdt-select" value={sort} onChange={(e) => onSort(e.target.value)} aria-label="Trier">
            <option value="activity">Dernière activité</option>
            <option value="added">Date d'ajout</option>
            <option value="alpha">Alphabétique</option>
          </select>
        )}
      </div>
      {open && (
        visible.length === 0 ? (
          <div className="mdt-empty">
            {total === 0
              ? `Rien dans cette section — ${emptyHint}.`
              : queryActive
                ? `Aucun titre de ta bibliothèque ne correspond à « ${query} » — bascule sur « En ligne » pour l'ajouter.`
                : "Aucune franchise ne correspond à ce filtre."}
          </div>
        ) : (
          <div className="mdt-grid">
            {visible.map(({ f, entries, st }) => (
              <MdtCard key={f.id} f={f} entries={entries} st={st}
                cur={currentEntryOf(entries, progressById)}
                progressById={progressById}
                onOpen={onOpen} />
            ))}
          </div>
        )
      )}
    </section>
  );
}

// Sonde de survie de la PWA mobile. Le payload de usage_events est un JSONB
// ouvert : un champ suffit, pas de migration ni de nouvel event_type.
// Question a laquelle elle repond dans trois semaines : le telephone est-il
// reellement sorti pour ca ? Un volume nul est une reponse, pas un retard.
function mdtSurface(){
  try {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
      || window.navigator.standalone
      ? "pwa" : "cockpit";
  } catch { return "cockpit"; }
}
function mdtTrack(type, payload){
  // payload EN DERNIER : sinon un futur payload portant sa propre cle
  // `surface` ecraserait celle calculee ici, et docs/telemetry.md:11 promet
  // que ca n'arrive jamais.
  window.track && window.track(type, Object.assign({}, payload || {}, { surface: mdtSurface() }));
}

function PanelMediatheque({ data, onNavigate }) {
  const D = window.MEDIATHEQUE_DATA || { franchises: [], entries: [], progress: [], releases: [] };
  const [tick, setTick] = useMdtState(0);            // bump après mutation locale de D
  const [statusFilter, setStatusFilter] = useMdtState("all");
  const [sort, setSort] = useMdtState("activity");
  const [collectionOpen, setCollectionOpen] = useMdtState(() => {
    try { return localStorage.getItem("mdt-collection-open") === "1"; } catch { return false; }
  });
  // Effets de bord (persistance + télémétrie) dans le handler, PAS dans
  // l'updater : un updater doit rester pur, sinon un rendu concurrent rejoué
  // ré-émettrait l'événement.
  function toggleCollection() {
    const next = !collectionOpen;
    setCollectionOpen(next);
    try { localStorage.setItem("mdt-collection-open", next ? "1" : "0"); } catch {}
    mdtTrack("mediatheque_collection_toggle", { open: next, count: visible.length });
  }
  const [query, setQuery] = useMdtState("");          // >= 1 char => filtre la bibliothèque locale, >= 3 chars => recherche AniList aussi
  const [view, setView] = useMdtState("library");     // "library" | "search" — bascule explicite recherche/bibliothèque
  const [fiche, setFiche] = useMdtState(null);        // {mode:"library"|"preview", ...} (Tasks 8-9)
  const q = query.trim();
  const queryActive = q.length >= 1;      // filtrage local instantané
  const searching = q.length >= 3;        // seuil d'appel AniList (inchangé)
  const [results, setResults] = useMdtState(null);   // null = idle, [] = zéro résultat
  const [section, setSection] = useMdtState(mdtReadSection);
  const sectionDef = mdtSectionOf(section);
  // Même pattern que lastfm_api_key (panel-musique.jsx) : clé plate dans
  // user_profile, lue au Tier 1. Absente => la recherche n'interroge qu'AniList.
  const tmdbKey = ((window.PROFILE_DATA && window.PROFILE_DATA._values) || {}).tmdb_api_key || null;
  const [searchErr, setSearchErr] = useMdtState(null);
  const inSearchView = queryActive && view === "search"; // corps = résultats AniList ; sinon = bibliothèque
  // Section vide : la collection est forcée ouverte, sinon son en-tête ne cache
  // que du vide et son message d'accueil reste inatteignable. Le critère est
  // devenu la SECTION et non la bibliothèque entière — sur « Séries » à zéro
  // titre, un pli fermé au milieu d'une page vide ne se lit pas comme un pli.
  // Déclaré plus bas, après `sectionCards` (voir l'avertissement Babel).

  const prevQ = useMdtRef("");
  // Vue par défaut : ta bibliothèque d'abord. On ne bascule sur AniList que si
  // la requête ne correspond à rien de ce que tu possèdes déjà.
  // INVARIANT : ce choix automatique n'a lieu qu'au DÉBUT d'une requête (q
  // précédent vide). Dès qu'une recherche est en cours, la bascule manuelle de
  // l'utilisateur gagne — sinon chaque frappe le ramenait sur « Ma bibliothèque ».
  // Vider le champ remet tout à zéro. `localMatches` est volontairement HORS
  // des dépendances : l'effet ne doit pas rejouer quand la bibliothèque mute en
  // arrière-plan (un +1 épisode ailleurs sur la page changerait la vue sous les
  // doigts de l'utilisateur).
  useMdtEffect(() => {
    if (!queryActive) {
      prevQ.current = "";
      setView("library"); setResults(null); setSearchErr(null);
      return;
    }
    if (!prevQ.current) setView(localMatches.length > 0 ? "library" : "search");
    prevQ.current = q;
    const t = setTimeout(() => {
      mdtTrack("mediatheque_filter_local", { q_len: q.length, matches: localMatches.length });
    }, 400);
    return () => clearTimeout(t);
  }, [q, queryActive]);

  // Les deux sources sont interrogées EN PARALLÈLE et leurs résultats fusionnés
  // dans une forme commune : le rendu n'a alors aucun `if (src === …)`, et une
  // troisième source ne toucherait que cette fonction.
  useMdtEffect(() => {
    if (!searching) { setResults(null); setSearchErr(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const [ani, manga, tmdb] = await Promise.allSettled([
        window.anilist.searchAnime(q),
        window.anilist.searchManga(q),
        tmdbKey && window.tmdb ? window.tmdb.search(q, tmdbKey) : Promise.resolve([]),
      ]);
      if (cancelled) return;

      // Forme commune aux deux corpus AniList : seul le badge diffère.
      const aniMap = (badge) => (m) => ({
        src: "anilist", kind: null, id: m.id,
        title: (m.title && (m.title.english || m.title.romaji)) || "?",
        native: (m.title && m.title.native) || null,
        year: (m.startDate && m.startDate.year) || null,
        format: m.format || null, poster: (m.coverImage && m.coverImage.large) || null,
        genres: m.genres || [], badge, score: m.averageScore || 0,
      });
      const aniRows = ani.status === "fulfilled" ? ani.value.map(aniMap("Anime")) : [];
      const mangaRows = manga.status === "fulfilled" ? manga.value.map(aniMap("Manga")) : [];

      const tmdbRows = tmdb.status === "fulfilled" ? tmdb.value.map((r) => ({
        src: "tmdb", kind: r.kind, id: r.tmdb_id,
        title: r.title, native: null, year: r.year ? Number(r.year) : null,
        format: r.kind === "tv" ? "TV" : "MOVIE", poster: r.poster_url,
        genres: [], badge: r.kind === "tv" ? "Série" : "Film",
        // popularity TMDB n'a pas la même échelle qu'averageScore : on la
        // ramène sur 0-100 pour que le tri commun ait un sens.
        score: Math.min(100, Math.round(r.popularity || 0)),
      })) : [];

      // Une source qui tombe ne doit pas masquer l'autre : on affiche ce qu'on
      // a et on le signale, plutôt qu'un écran d'erreur alors que la moitié du
      // résultat est disponible. Erreur bloquante seulement si TOUT a échoué.
      const sources = [ani, manga, tmdb];
      const failed = sources.filter((p) => p.status === "rejected").length;
      setResults([...aniRows, ...mangaRows, ...tmdbRows].sort((a, b) => b.score - a.score));
      setSearchErr(failed === sources.length ? "Aucune source ne répond — réessaie dans un instant."
        : failed >= 1 ? "Une source n'a pas répondu — résultats partiels." : null);
      mdtTrack("mediatheque_search", {
        q_len: q.length, results: aniRows.length + mangaRows.length + tmdbRows.length,
        sources: (aniRows.length ? 1 : 0) + (mangaRows.length ? 1 : 0) + (tmdbRows.length ? 1 : 0),
      });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, searching, tmdbKey]);

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

  const ratingById = useMdtMemo(() => {
    const map = new Map();
    for (const p of D.progress) if (p.rating != null) map.set(p.entry_id, p.rating);
    return map;
  }, [D.progress, tick]);

  const libSourceIds = useMdtMemo(
    // La cle porte la source : un id TMDB et un id AniList peuvent etre le
    // meme nombre. `tmdb_season` se replie sur `tmdb` car un resultat de
    // recherche designe la serie entiere, pas une saison.
    () => new Set(D.entries.map((e) => `${e.source.startsWith("tmdb") ? "tmdb" : e.source}:${e.source_id}`)),
    [D.entries, tick]);

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

  // La section gouverne la NAVIGATION (hero, rail, agenda, collection), jamais
  // la décision : `pickTonight` lit `cards`, pas `sectionCards`. Restreindre
  // « Ce soir » à l'anime rendrait runtime_minutes et le budget « 2 h+ »
  // inutiles, puisqu'un épisode d'anime dure 24 minutes — et la question du
  // soir est « qu'est-ce que je regarde », pas « quel anime ». C'est pour ça
  // que la bande est rendue AU-DESSUS des onglets : sa portée est la
  // bibliothèque entière, et sa place doit le dire.
  const sectionCards = useMdtMemo(
    () => window.mdtView.cardsOfSection(cards, section),
    [cards, section]);

  const sectionCounts = useMdtMemo(
    () => window.mdtView.countBySection(cards, MDT_SECTION_IDS),
    [cards]);

  // Voir plus haut : le pli forcé se décide sur la section, pas sur D.franchises.
  const sectionEmpty = sectionCards.length === 0;

  // ⚠️ sectionCards doit rester DÉCLARÉ AVANT `visible`, qui le consomme.
  // Babel standalone transpile `const` en `var` : une utilisation trop tôt ne
  // lève pas d'erreur de zone morte mais donne `undefined.filter`, et le panel
  // entier tombe dans l'error boundary. Bug vécu en prod le 2026-07-25.

  const localMatches = useMdtMemo(
    () => (queryActive ? cards.filter((c) => window.mdtView.matchesQuery(c.f, q)) : []),
    [cards, q, queryActive]);

  const visible = useMdtMemo(() => {
    // Une recherche active prime sur la section : elle porte sur TOUTE la
    // bibliothèque, mises de côté comprises (chercher doit retrouver ce qu'on a
    // rangé — et ne pas dépendre de l'onglet où on se trouvait). C'est aussi
    // pourquoi les onglets se masquent tant qu'une requête est en cours : ils
    // annonceraient un périmètre que la liste ne respecte pas.
    let list = localMatches;
    if (!queryActive) {
      list = sectionCards;
      if (statusFilter === "shelved") {
        list = list.filter((c) => c.f.shelved);
      } else {
        list = list.filter((c) => !c.f.shelved);   // "Tous" + buckets actifs excluent les mis de côté
        if (statusFilter === "to_watch") list = list.filter((c) => c.st.id === "to_watch");
        else if (statusFilter === "watching") list = list.filter((c) => c.st.id === "watching" || c.st.id === "up_to_date");
        else if (statusFilter === "seen") list = list.filter((c) => c.st.id === "seen");
      }
    }
    const bySort = {
      activity: (a, b) => b.lastTouch - a.lastTouch,
      added: (a, b) => new Date(b.f.added_at || 0) - new Date(a.f.added_at || 0),
      alpha: (a, b) => (a.f.title_english || a.f.title_romaji || "").localeCompare(b.f.title_english || b.f.title_romaji || ""),
    };
    return [...list].sort(bySort[sort] || bySort.activity);
  }, [sectionCards, localMatches, queryActive, statusFilter, sort]);

  // Le gate de rendu ({!inSearchView && …}) porte seul la visibilité ; on calcule
  // toujours le vrai pick pour éviter que le hero d'accueil vide s'affiche par-dessus
  // une grille pleine quand on revient sur « Ma bibliothèque » pendant une recherche.
  // Le hero est PROPRE À LA SECTION : c'est la mise en avant du rayon qu'on
  // regarde, pas de la bibliothèque entière — sinon ouvrir « Séries » afficherait
  // un anime en tête d'écran.
  const hero = useMdtMemo(() => pickHero(sectionCards), [sectionCards]);

  // ── « Ce soir » ────────────────────────────────────────────
  // De 18 h à 2 h, la bande remplace le hero. Le reste de la journée, rien
  // n'est calculé : `evening` est faux et `tonight` reste vide.
  // Elle reste UNIQUE et globale même avec les sections : aucun hero n'est
  // rendu nulle part entre 18 h et 2 h. Deux surfaces de mise en avant à 22 h,
  // c'en est une de trop — les séparer de 200 px ne les réconcilie pas.
  const [budget, setBudget] = useMdtState(() => mdtReadBudget(Date.now()));
  const evening = useMdtMemo(() => window.mdtView.isEvening(Date.now()), [tick]);
  const dayLoad = D.dayLoad || null;

  const tonight = useMdtMemo(
    () => (evening
      ? window.mdtView.pickTonight(cards, progressById, { budgetMin: budget, dayLoad }, Date.now())
      : []),
    [evening, cards, progressById, budget, dayLoad, tick]);

  const tonightHeadline = useMdtMemo(
    () => window.mdtView.tonightHeadline(tonight, { budgetMin: budget, dayLoad }, Date.now()),
    [tonight, budget, dayLoad, tick]);

  // ── « Avant l'épisode » ────────────────────────────────────
  // Les mots suivent la série que la page met déjà en avant : la première
  // proposition de « Ce soir » le soir, le hero en journée. On ne crée pas
  // une troisième sélection concurrente.
  //
  // La bande ne vit QUE dans la section Anime (`sectionDef.japanese`) :
  // pipelines/jp_vocab_sync.py filtre `media_type == "anime"`, il n'existe
  // aucun mot pour une franchise TMDB. La rendre ailleurs ne produirait pas
  // une bande pauvre, mais une bande vide à tous les coups.
  // Le soir, « Ce soir » est global : sa première proposition peut être une
  // série. On prend alors la première proposition ANIME, et à défaut le hero
  // de la section — plutôt que de laisser la bande disparaître un soir sur deux.
  const jpWords = D.jpWords || [];
  const jpSeenByWord = useMdtMemo(
    () => new Map((D.jpSeen || []).map((r) => [r.word, r])),
    [D.jpSeen, tick]);
  const jpFranchise = useMdtMemo(() => {
    if (!sectionDef.japanese) return null;
    const pick = evening
      ? (tonight.find((p) => window.mdtView.typeOf(p.card.f) === "anime") || null)
      : hero;
    return (pick && pick.card && pick.card.f) || null;
  }, [sectionDef, evening, tonight, hero]);

  // Dénominateur de la sonde de survie. Sans lui, « 0 marquage » ne distingue
  // pas « jamais affiché » de « affiché et ignoré » — et le critère d'arrêt
  // (volume nul sur 3 semaines → retirer la bande) serait ininterprétable.
  // Une seule fois par montage : c'est une mesure d'exposition, pas de rendu.
  const jpShownRef = useMdtRef(false);
  useMdtEffect(() => {
    if (jpShownRef.current || !jpFranchise) return;
    const fresh = jpWords.filter((w) => w.franchise_id === jpFranchise.id
      && (jpSeenByWord.get(w.word) || {}).status !== "known").length;
    if (!fresh) return;
    jpShownRef.current = true;
    mdtTrack("jp_band_shown",
      { words: Math.min(fresh, MDT_JP_MAX), evening });
  }, [jpFranchise, jpWords, jpSeenByWord, evening]);

  // Une seule section active, toujours : contrairement aux chips qu'elle
  // remplace, il n'existe pas d'état « rien de coché » à garder contre
  // l'utilisateur. Persistée pour retomber sur le même rayon au prochain
  // chargement — y compris depuis la PWA, qui monte le même panel.
  function pickSection(id) {
    if (id === section || !MDT_SECTION_IDS.includes(id)) return;
    setSection(id);
    setStatusFilter("all");   // « Mis de côté » d'un rayon n'a pas de sens dans l'autre
    try { localStorage.setItem(MDT_SECTION_KEY, id); } catch (_) {}
    mdtTrack("mediatheque_section", { section: id, count: sectionCounts[id] || 0 });
  }

  function pickBudget(value) {
    setBudget(value);
    mdtWriteBudget(value, Date.now());
    mdtTrack("mediatheque_tonight_budget",
      { budget_min: value, candidates: tonight.length });
  }

  // L'état vide est un signal produit : si « Ce soir » ne propose rien, c'est
  // que le budget est trop serré ou la bibliothèque à jour. On veut le savoir.
  useMdtEffect(() => {
    if (evening && !tonight.length) {
      mdtTrack("mediatheque_tonight_empty",
        { budget_min: budget, hour: new Date().getHours() });
    }
  }, [evening, tonight.length, budget]);

  // Un même titre ne doit jamais apparaître deux fois : le rail retire ce que
  // la page met déjà en avant — le hero en journée, « Ce soir » après 18 h.
  const railCards = useMdtMemo(
    () => window.mdtView.pickRail(sectionCards, evening
      ? tonight.map((p) => p.card.f.id)
      : (hero && hero.card ? [hero.card.f.id] : [])),
    [sectionCards, hero, tonight, evening]);

  // `res` est une ligne de résultat normalisée ({src, kind, id, …}). La fiche
  // de prévisualisation porte désormais sa source pour qu'addFranchise sache
  // quel mapper appeler.
  async function openPreview(res) {
    setFiche({ mode: "preview", loading: true });
    try {
      if (res.src === "tmdb") {
        const { detail, kind } = await window.tmdb.fetchFranchiseLive(res.id, res.kind, tmdbKey);
        // Dédup par (source, id) et non par id seul : les ids TMDB et AniList
        // vivent dans des namespaces distincts et peuvent collider.
        const src = kind === "tv" ? "tmdb_tv" : "tmdb_movie";
        const existing = D.franchises.find((f) => f.source === src && f.source_root_id === detail.id);
        if (existing) { setFiche({ mode: "library", franchiseId: existing.id }); return; }
        setFiche({ mode: "preview", src: "tmdb", detail, kind });
        return;
      }
      const { built, mediaById } = await window.anilist.fetchFranchiseLive(res.id);
      const existing = D.franchises.find((f) => f.source === "anilist" && f.source_root_id === built.root_id);
      if (existing) { setFiche({ mode: "library", franchiseId: existing.id }); return; }
      setFiche({ mode: "preview", src: "anilist", built, mediaById });
    } catch (e) {
      setFiche(null);
      window.cockpitToast && cockpitToast("Fiche indisponible — réessaie.", { kind: "error" });
    }
  }

  async function addFranchise(fiche) {
    const base = window.SUPABASE_URL + "/rest/v1/";
    const isTmdb = fiche.src === "tmdb";
    const frRow = isTmdb
      ? window.tmdb.toFranchiseRow(fiche.detail, fiche.kind)
      : window.anilist.toFranchiseRow(fiche.built, fiche.mediaById);
    const rootId = isTmdb ? fiche.detail.id : fiche.built.root_id;
    let created = null;
    try {
      const [fr] = await window.sb.postJSON(base + "media_franchises", frRow);
      created = fr;
      const rows = isTmdb
        ? window.tmdb.toEntryRows(fiche.detail, fiche.kind)
        : window.anilist.toEntryRows(fiche.built, fiche.mediaById);
      const entryRows = rows.map((r) => ({ ...r, franchise_id: fr.id }));
      const savedEntries = await window.sb.postJSON(base + "media_entries", entryRows);
      window.MEDIATHEQUE_DATA.franchises.unshift(fr);
      window.MEDIATHEQUE_DATA.entries.push(...savedEntries);
      setTick((t) => t + 1);
      // On atterrit dans la section du titre ajouté. Sans ça, ajouter une série
      // depuis la recherche (globale) la ferait disparaître à la fermeture de la
      // fiche : elle serait bien en base, mais dans un onglet qu'on ne regarde
      // pas — indiscernable d'un ajout raté.
      const addedSection = window.mdtView.typeOf(fr);
      if (addedSection !== section && MDT_SECTION_IDS.includes(addedSection)) {
        setSection(addedSection);
        setStatusFilter("all");
        try { localStorage.setItem(MDT_SECTION_KEY, addedSection); } catch (_) {}
      }
      setFiche({ mode: "library", franchiseId: fr.id });
      mdtTrack("mediatheque_add", {
        franchise_root_id: rootId, entries: savedEntries.length, source: frRow.source,
      });
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
      mdtTrack("mediatheque_progress", { entry_kind: entry.kind, delta: value - (prevValue || 0), completed: value >= released && released > 0 });
    } catch (e) {
      // Rollback.
      if (prevValue === null) { const i = D2.progress.findIndex((p) => p.entry_id === entry.id); if (i >= 0) D2.progress.splice(i, 1); }
      else { const p = D2.progress.find((x) => x.entry_id === entry.id); if (p) p.episodes_watched = prevValue; }
      setTick((t) => t + 1);
      cockpitToast("Progression non enregistrée — réessaie.", { kind: "error" });
    }
  }

  // Marque un mot comme connu. Optimiste + rollback, comme writeProgress.
  // seen_count s'incrémente pour mesurer si la bande sert vraiment ; il ne
  // pilote aucune planification — il n'y en a pas.
  async function markWord(word, status) {
    const D2 = window.MEDIATHEQUE_DATA;
    if (!Array.isArray(D2.jpSeen)) D2.jpSeen = [];
    const prev = D2.jpSeen.find((r) => r.word === word.word);
    // Copie complète et non le seul statut : `row` écrase aussi seen_count et
    // updated_at, qu'un rollback partiel laisserait durablement faux.
    const snapshot = prev ? { ...prev } : null;
    const row = {
      word: word.word,
      status,
      seen_count: (prev ? prev.seen_count || 0 : 0) + 1,
      updated_at: new Date().toISOString(),
    };
    if (prev) Object.assign(prev, row);
    else D2.jpSeen.push(row);
    setTick((t) => t + 1);
    try {
      const url = window.SUPABASE_URL + "/rest/v1/jp_seen?on_conflict=word";
      const res = await fetch(url, {
        method: "POST",
        headers: { ...window.sb.headers, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([row]),
      });
      if (!res.ok) throw new Error("jp_seen " + res.status);
      mdtTrack("jp_word_marked", { status, first_time: snapshot === null });
    } catch (e) {
      if (snapshot === null) {
        const i = D2.jpSeen.findIndex((r) => r.word === word.word);
        if (i >= 0) D2.jpSeen.splice(i, 1);
      } else if (prev) {
        Object.assign(prev, snapshot);
      }
      setTick((t) => t + 1);
      cockpitToast("Mot non enregistré — réessaie.", { kind: "error" });
    }
  }

  async function writeRating(entry, value) {
    const D2 = window.MEDIATHEQUE_DATA;
    const prev = D2.progress.find((p) => p.entry_id === entry.id);
    const prevRating = prev ? (prev.rating != null ? prev.rating : null) : undefined; // undefined = aucune ligne
    // Optimiste. On n'envoie PAS episodes_watched → merge-duplicates préserve la valeur existante.
    if (prev) prev.rating = value;
    else D2.progress.push({ entry_id: entry.id, episodes_watched: 0, rating: value, updated_at: new Date().toISOString() });
    setTick((t) => t + 1);
    try {
      const url = window.SUPABASE_URL + "/rest/v1/media_progress?on_conflict=entry_id";
      const res = await fetch(url, {
        method: "POST",
        headers: { ...window.sb.headers, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([{ entry_id: entry.id, rating: value, updated_at: new Date().toISOString() }]),
      });
      if (!res.ok) throw new Error("rating " + res.status);
      mdtTrack("mediatheque_rate", { entry_kind: entry.kind, rating: value, cleared: value === null });
    } catch (e) {
      if (prevRating === undefined) { const i = D2.progress.findIndex((p) => p.entry_id === entry.id); if (i >= 0) D2.progress.splice(i, 1); }
      else { const p = D2.progress.find((x) => x.entry_id === entry.id); if (p) p.rating = prevRating; }
      setTick((t) => t + 1);
      cockpitToast("Note non enregistrée — réessaie.", { kind: "error" });
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
      mdtTrack("mediatheque_remove", { franchise_root_id: f ? f.source_root_id : null });
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
      mdtTrack("mediatheque_shelve", { shelved: next, franchise_root_id: f.source_root_id });
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
      mdtTrack("mediatheque_release_ack", { event_type: release.event_type });
    } catch (e) {
      release.acknowledged = false;
      setTick((t) => t + 1);
      cockpitToast("Acquittement non enregistré — réessaie.", { kind: "error" });
    }
  }

  return (
    <div className="panel-mediatheque">
      <div className="mdt-kicker">{sectionDef.kicker}</div>
      <h1 className="mdt-title">Médiathèque</h1>

      {/* Surfaces GLOBALES, au-dessus des onglets : sorties toutes sections
          confondues, puis la décision du soir. Leur place dit leur portée. */}
      <MdtReleasesStrip D={D} onAck={ackRelease} />

      {/* De 18 h à 2 h la décision prime sur la mise en avant : deux surfaces
          qui se disputent la même place à 22 h, c'est une de trop. */}
      {!queryActive && evening && (
        <MdtTonight picks={tonight} headline={tonightHeadline}
          budget={budget} onBudget={pickBudget} progressById={progressById}
          onOpen={(fr) => setFiche({ mode: "library", franchiseId: fr.id })}
          onProgress={writeProgress} />
      )}

      {/* Masqués pendant une recherche : celle-ci porte sur toute la
          bibliothèque, des onglets visibles annonceraient un périmètre faux. */}
      {!queryActive && (
        <MdtSectionTabs section={section} counts={sectionCounts} onSelect={pickSection} />
      )}

      {!queryActive && !evening && (
        <MdtHero hero={hero} progressById={progressById}
          onOpen={(fr) => setFiche({ mode: "library", franchiseId: fr.id })}
          onProgress={writeProgress} />
      )}

      {/* Après la mise en avant, jamais avant : on décide quoi regarder, puis
          on s'échauffe. L'inverse ferait barrage à l'usage principal. */}
      {!queryActive && (
        <MdtJapanese franchise={jpFranchise} words={jpWords}
          seenByWord={jpSeenByWord} onMark={markWord} />
      )}

      {!queryActive && (
        <MdtRail cards={railCards} progressById={progressById}
          onOpen={(fr) => setFiche({ mode: "library", franchiseId: fr.id })}
          onProgress={writeProgress} />
      )}

      {!queryActive && (
        <MdtWeek D={D} tick={tick} section={section}
          onOpen={(id) => setFiche({ mode: "library", franchiseId: id })} />
      )}

      {/* Le champ, lui, reste GLOBAL : il interroge la bibliothèque entière et
          les deux sources en ligne quelle que soit la section ouverte. */}
      <div className="mdt-toolbar">
        <input
          className="mdt-search"
          type="search"
          placeholder="Rechercher — ta bibliothèque, puis AniList et TMDB…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={sectionDef.searchLabel}
        />
      </div>

      {queryActive && (
        <div className="mdt-viewtoggle" role="group" aria-label="Basculer entre ma bibliothèque et les résultats en ligne">
          <button className={`mdt-viewtoggle-btn ${view === "library" ? "is-active" : ""}`}
            aria-pressed={view === "library"} onClick={() => setView("library")}>
            Ma bibliothèque · {localMatches.length}
          </button>
          <button className={`mdt-viewtoggle-btn ${view === "search" ? "is-active" : ""}`}
            aria-pressed={view === "search"} onClick={() => setView("search")}>
            En ligne{results ? ` · ${results.length}` : ""}
          </button>
        </div>
      )}

      {inSearchView ? (
        !searching ? <div className="mdt-empty">Tape au moins 3 caractères pour chercher en ligne.</div> :
        results === null ? <div className="mdt-spinner">Recherche…</div> :
        results.length === 0 ? (
          searchErr ? <div className="mdt-error">{searchErr}</div>
            : <div className="mdt-empty">Aucun résultat pour « {q} ».</div>
        ) : (
          <div className="mdt-results">
            {results.map((m) => {
              const inLib = libSourceIds.has(`${m.src}:${m.id}`);
              return (
                <button key={`${m.src}:${m.id}`} className="mdt-result" onClick={() => openPreview(m)}>
                  {m.poster ? <img src={m.poster} alt="" loading="lazy" /> : <div style={{ width: 56 }} />}
                  <div>
                    <p className="mdt-result-title">
                      {m.title}<span className="mdt-result-src">{m.badge}</span>
                    </p>
                    <p className="mdt-result-sub">
                      {m.format || "?"} · {m.year || "?"}
                      {m.score ? ` · ${m.score}%` : ""}
                      {m.native ? ` · ${m.native}` : ""}
                    </p>
                    <p className="mdt-result-genres">{(m.genres || []).slice(0, 3).join(" · ")}</p>
                    {inLib && <span className="mdt-inlib">déjà dans ta bibliothèque</span>}
                  </div>
                </button>
              );
            })}
            {/* Une source muette ne masque pas l'autre : on le dit en pied. */}
            {searchErr && <p className="mdt-results-partial">{searchErr}</p>}
          </div>
        )
      ) : (
        <MdtCollection
          visible={visible} total={sectionCards.length}
          open={collectionOpen || queryActive || sectionEmpty}
          onToggle={toggleCollection}
          statusFilter={statusFilter} onStatusFilter={setStatusFilter}
          sort={sort} onSort={setSort}
          progressById={progressById}
          onOpen={(fr) => setFiche({ mode: "library", franchiseId: fr.id })}
          queryActive={queryActive} query={q}
          emptyHint={sectionDef.emptyHint} />
      )}

      {fiche && (
        <FicheFranchise
          fiche={fiche} D={D} progressById={progressById} ratingById={ratingById}
          onClose={() => setFiche(null)}
          onAdd={fiche.mode === "preview" && (fiche.built || fiche.detail) ? () => addFranchise(fiche) : null}
          onProgress={fiche.mode === "library" ? writeProgress : null}
          onRemove={fiche.mode === "library" ? () => removeFranchise(fiche.franchiseId) : null}
          onShelve={fiche.mode === "library" ? () => toggleShelved(fiche.franchiseId) : null}
          onRating={fiche.mode === "library" ? writeRating : null}
        />
      )}
    </div>
  );
}

window.PanelMediatheque = PanelMediatheque;
