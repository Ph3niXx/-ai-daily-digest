// Home — Brief du jour. Three theme variants share this component
// but the theme's vibe tokens (dividerStyle, accentShape, etc.)
// meaningfully reshape the layout feel.

// ── Sélection de la veille ───────────────────────────────────────────
// Confiance réelle de la sélection du jour (pipelines/veille_picks.py),
// affichée uniquement quand elle existe. Remplace un « score de pertinence »
// qui valait `94 - i * 6` : trois chiffres décroissants collés aux trois
// derniers articles crawlés, barre de progression à l'appui.
const TOP_CONF_LABEL = { high: "sûr", medium: "probable", low: "à voir" };

// Raisons proposées sur un 👎. Miroir de Jobs Radar : on demande POURQUOI,
// parce qu'un pouce nu n'apprend presque rien — c'est le motif qui permet de
// réécrire les règles de sélection.
const TOP_DOWN_REASONS = [
  { key: "seen", label: "déjà vu" },
  { key: "off_topic", label: "pas mon sujet" },
  { key: "shallow", label: "trop superficiel" },
  { key: "not_actionable", label: "rien d'actionnable" },
];

// Audio brief — reads the macro title + body via Web Speech API.
// No external provider: uses the browser's built-in French voice.
function AudioBriefChip({ macro }) {
  const [state, setState] = React.useState("idle"); // idle | speaking
  const est = Math.max(1, Math.round((macro.body || "").length / 280));
  const label = state === "speaking" ? "Arrêter" : `Lecture audio · ${est} min`;
  const iconName = state === "speaking" ? "check" : "play";

  function speak(){
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const text = (macro.title ? macro.title + ". " : "") + (macro.body || "");
    if (!text.trim()) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 1.02;
    u.pitch = 1;
    const voices = synth.getVoices();
    const fr = voices.find(v => /^fr/i.test(v.lang));
    if (fr) u.voice = fr;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    synth.speak(u);
    setState("speaking");
  }
  function stop(){
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("idle");
  }
  React.useEffect(() => () => stop(), []);

  return (
    <button className="ph-chip" onClick={state === "speaking" ? stop : speak}>
      <Icon name={iconName} size={10} stroke={2} /> {label}
    </button>
  );
}

function estimateReadingTime(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 230));
  return `${minutes} min`;
}
window.estimateReadingTime = estimateReadingTime;

function TrendArrow({ trend, delta }) {
  if (trend === "new") return <span className="pill-badge pill-badge--new">NEW</span>;
  if (trend === "rising") return (
    <span className="delta delta--up">
      <Icon name="arrow_up" size={12} stroke={2.5} />+{delta}
    </span>
  );
  if (trend === "declining") return (
    <span className="delta delta--down">
      <Icon name="arrow_down" size={12} stroke={2.5} />{delta}
    </span>
  );
  return <span className="delta delta--flat">—</span>;
}

function RadarSVG({ axes, size = 260 }) {
  const cx = size / 2, cy = size / 2;
  const radius = size / 2 - 30;
  const n = axes.length;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const points = axes.map((a, i) => {
    const r = (a.score / 100) * radius;
    return [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];
  });
  const rings = [0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }}>
      {rings.map((r, i) => {
        const pts = axes.map((_, j) => {
          const rr = r * radius;
          return `${cx + Math.cos(angle(j)) * rr},${cy + Math.sin(angle(j)) * rr}`;
        }).join(" ");
        return <polygon key={i} points={pts} className="radar-ring" />;
      })}
      {axes.map((_, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + Math.cos(angle(i)) * radius}
          y2={cy + Math.sin(angle(i)) * radius}
          className="radar-spoke" />
      ))}
      <polygon points={points.map(p => p.join(",")).join(" ")} className="radar-shape" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={axes[i].gap ? 5 : 3.5}
          className={axes[i].gap ? "radar-pt radar-pt--gap" : "radar-pt"} />
      ))}
      {axes.map((a, i) => {
        const r = radius + 16;
        const x = cx + Math.cos(angle(i)) * r;
        const y = cy + Math.sin(angle(i)) * r;
        return <text key={i} x={x} y={y} className="radar-label"
          textAnchor={Math.abs(Math.cos(angle(i))) < 0.2 ? "middle" : (Math.cos(angle(i)) > 0 ? "start" : "end")}
          dominantBaseline="middle">{a.name}</text>;
      })}
    </svg>
  );
}

function Sparkbar({ values, max }) {
  const m = max || Math.max(...values);
  return (
    <div className="sparkbar">
      {values.map((v, i) => (
        <span key={i} className="sparkbar-tick" style={{ height: `${(v / m) * 100}%` }} />
      ))}
    </div>
  );
}

function Sparkline({ values, trend }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const w = 100, h = 32;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / Math.max(max - min, 1)) * (h - 4) - 2}`).join(" ");
  const cls = trend === "rising" ? "sl-rising" : trend === "declining" ? "sl-declining" : trend === "new" ? "sl-new" : "sl-stable";
  return (
    <svg className={`sparkline ${cls}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" strokeWidth="1.5" />
      <circle cx={(values.length - 1) * step} cy={h - ((values[values.length-1] - min) / Math.max(max - min, 1)) * (h - 4) - 2} r="2.5" />
    </svg>
  );
}

function SignalCard({ signal, rank, onNavigate }) {
  const trendLabel = { rising: "EN HAUSSE", new: "NOUVEAU", declining: "EN BAISSE", stable: "STABLE" }[signal.trend];
  const isRecent = signal.trend === "new";
  return (
    <article className={`sig-card sig-card--${signal.trend}`} data-recent={isRecent ? "1" : "0"}>
      <div className="sig-card-head">
        <span className="sig-card-rank">#{String(rank + 1).padStart(2, "0")}</span>
        <span className={`sig-card-badge sig-card-badge--${signal.trend}`}>{trendLabel}</span>
        <span className="sig-card-cat">{signal.category}</span>
      </div>
      <h3 className="sig-card-term">{signal.name}</h3>
      <p className="sig-card-context">{signal.context}</p>
      <div className="sig-card-foot">
        <div className="sig-card-stats">
          <span className="sig-card-count">{signal.count}</span>
          <span className="sig-card-count-label">mentions<br/>cette semaine</span>
        </div>
        <div className="sig-card-spark">
          <Sparkline values={signal.history} trend={signal.trend} />
          <div className="sig-card-delta">
            {signal.trend === "new" ? <span className="sig-card-delta-new">nouveau signal</span>
              : signal.delta > 0 ? <span className="sig-card-delta-up"><Icon name="arrow_up" size={10} stroke={2.5} />+{signal.delta}</span>
              : signal.delta < 0 ? <span className="sig-card-delta-down"><Icon name="arrow_down" size={10} stroke={2.5} />{signal.delta}</span>
              : <span className="sig-card-delta-flat">stable</span>}
            <span className="sig-card-delta-window">8 sem.</span>
          </div>
        </div>
        <button
          className="card-action card-action--ask sig-card-ask"
          aria-label="Demander à Jarvis à propos de ce signal"
          onClick={(e) => {
            e.stopPropagation();
            const prompt = `À propos du signal "${signal.name}" (${signal.category}, ${trendLabel}) : ${signal.context || signal.count + " mentions cette semaine"}\nMa question : `;
            try { localStorage.setItem("jarvis-prefill", prompt); } catch {}
            if (typeof onNavigate === "function") onNavigate("jarvis");
          }}
        >
          <Icon name="message_circle" size={12} stroke={2} />
        </button>
      </div>
    </article>
  );
}

function MorningCard({ items = [], onNavigate }) {
  if (!items.length) return null;
  return (
    <section className="morning">
      <div className="morning-head">
        <div className="morning-eyebrow">Trois choses aujourd'hui</div>
        <h2 className="morning-title">Commence par ça.</h2>
      </div>
      <ol className="morning-list">
        {items.map((it, i) => (
          <li key={i} className="morning-item">
            <span className="morning-num">{String(i + 1).padStart(2, "0")}</span>
            <div className="morning-body">
              <div className="morning-kind">{it.kind}</div>
              <h3 className="morning-item-title">{it.title}</h3>
              <p className="morning-reason">{it.reason}</p>
            </div>
            <button
              className="morning-cta"
              onClick={() => {
                if (it.href) window.open(it.href, "_blank", "noopener");
                else if (it.navigate) onNavigate(it.navigate);
              }}
            >
              {it.cta} <Icon name="arrow_right" size={12} stroke={2} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MdtBriefCard({ releases = [], onNavigate }) {
  if (!releases.length) return null;
  return (
    <section className="mdt-brief" aria-label="Sorties médiathèque">
      <div className="mdt-brief-head">📺 Médiathèque — {releases.length} nouveauté{releases.length > 1 ? "s" : ""}</div>
      <ul className="mdt-brief-list">
        {releases.slice(0, 3).map((r) => (
          <li key={r.id}>{r.title}{r.event_date ? ` · ${r.event_date}` : ""}</li>
        ))}
      </ul>
      <button className="mdt-brief-cta" onClick={() => onNavigate && onNavigate("mediatheque")}>Ouvrir la médiathèque →</button>
    </section>
  );
}

// Encart Jeux du Brief. C'est le SEUL point de contact du lot 1 : la boucle
// entiere (voir -> decider -> ecrire) tient ici, sans ouvrir d'onglet.
// Deux actions, toutes deux ecrivent : acquitter l'evenement, ou cesser de
// suivre la licence. Rien ne s'accumule : un evenement acquitte ne revient pas.
function GamesBriefCard({ releases = [], onNavigate }) {
  const [hidden, setHidden] = React.useState({});
  const visible = releases.filter((r) => !hidden[r.id]);
  if (!visible.length) return null;

  const LABEL = {
    announced: "annoncé",
    date_announced: "daté",
    released: "sorti",
    cancelled: "annulé",
  };

  // window.sb.patchJSON renvoie la Response BRUTE et ne leve jamais sur un
  // 4xx/5xx (cockpit/lib/supabase.js:35-42, contrairement a postJSON). Sans
  // ce controle explicite de r.ok, un refus RLS passerait pour un succes et
  // la ligne disparaitrait de l'ecran sans avoir ete acquittee en base.
  async function patchOrThrow(path, body) {
    const r = await window.sb.patchJSON(window.SUPABASE_URL + path, body);
    if (!r.ok) throw new Error(String(r.status));
    return r;
  }

  // Les track() partent APRES le PATCH reussi, jamais avant : ces compteurs
  // sont le go/no-go du lot 2, un compteur qui monte sur une ecriture refusee
  // fausse la decision (convention du fichier : voir veille_feedback).
  async function ack(r) {
    setHidden((h) => ({ ...h, [r.id]: true }));   // optimiste
    try {
      await patchOrThrow("/rest/v1/game_releases?id=eq." + r.id, { acknowledged: true });
      window.track && window.track("games_release_ack", { event_type: r.event_type, surface: "brief" });
    } catch (e) {
      setHidden((h) => ({ ...h, [r.id]: false })); // rollback
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
  async function unwatch(r) {
    setHidden((h) => ({ ...h, [r.id]: true }));
    try {
      await patchOrThrow("/rest/v1/game_releases?id=eq." + r.id, { acknowledged: true });
      await patchOrThrow("/rest/v1/game_franchises?id=eq." + r.franchise_id, { watched: false });
      window.track && window.track("games_unwatch_franchise", { franchise: r.franchise_id, surface: "brief" });
    } catch (e) {
      setHidden((h) => ({ ...h, [r.id]: false }));
      window.track && window.track("error_shown", { context: "games_unwatch", message: e.message });
    }
  }

  return (
    <section className="gmb-brief" aria-label="Sorties jeux">
      <div className="gmb-brief-head">
        🎮 Jeux — {visible.length} nouveauté{visible.length > 1 ? "s" : ""}
      </div>
      <ul className="gmb-brief-list">
        {visible.slice(0, 3).map((r) => (
          <li key={r.id} className="gmb-brief-item">
            <span className="gmb-brief-text">
              {r.title}
              <span className="gmb-brief-tag">{LABEL[r.event_type] || r.event_type}</span>
            </span>
            <span className="gmb-brief-actions">
              <button className="gmb-brief-btn" onClick={() => ack(r)}
                      title="J'ai vu">✓</button>
              <button className="gmb-brief-btn is-dismiss" onClick={() => unwatch(r)}
                      title="Ne plus suivre cette licence">✕ licence</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Home({ theme, data, onNavigate, recentOnly, setRecentOnly }) {
  const { macro, top, signals, stats, date, user, radar, week } = data;
  const morningItems = data.morning_card || [];
  const [readTop, setReadTop] = React.useState({});
  const toggleRead = (rank) => {
    const wasRead = !!readTop[rank];
    setReadTop({ ...readTop, [rank]: !wasRead });
    if (!wasRead) {
      try { window.track && window.track("top_card_collapsed", { rank }); } catch {}
    }
  };
  // ── Vote sur la sélection ──────────────────────────────────
  // Boucle d'apprentissage : le verdict remonte dans article_feedback, que
  // veille_picks.py relit pour réécrire user_profile.veille_pref_rules. Copie
  // conforme de Jobs Radar, la seule boucle du cockpit dont on ait la preuve
  // qu'elle change quelque chose (42 votes, règles réellement ajustées).
  const [votes, setVotes] = React.useState(() => {
    const m = {};
    (data.article_feedback || []).forEach(f => { m[f.article_id] = f.verdict; });
    return m;
  });
  // Quel article attend qu'on précise son motif de rejet.
  const [askReason, setAskReason] = React.useState(null);

  async function sendVote(articleId, verdict, reason) {
    if (!articleId) return;
    const prev = votes[articleId];
    setVotes(v => ({ ...v, [articleId]: verdict }));
    setAskReason(null);
    try {
      const res = await fetch(window.SUPABASE_URL + "/rest/v1/article_feedback?on_conflict=article_id", {
        method: "POST",
        headers: { ...window.sb.headers, "Content-Type": "application/json",
                   "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify([{
          article_id: articleId, verdict, reason: reason || null,
          pick_date: new Date().toISOString().slice(0, 10),
        }]),
      });
      if (!res.ok) throw new Error("feedback " + res.status);
      window.track && window.track("veille_feedback", { verdict, reason: reason || null });
    } catch (e) {
      // Rollback : un vote qu'on croit enregistré et qui ne l'est pas fausse
      // silencieusement le recalibrage.
      setVotes(v => { const n = { ...v }; if (prev) n[articleId] = prev; else delete n[articleId]; return n; });
      window.cockpitToast && window.cockpitToast("Vote non enregistré — réessaie.", { kind: "error" });
    }
  }

  const [snoozedTop, setSnoozedTop] = React.useState({});
  const snoozeCard = (id, rank) => {
    if (!id || !window.snooze) return;
    window.snooze.add(id, 3);
    setSnoozedTop((prev) => ({ ...prev, [rank]: true }));
  };
  const [undoState, setUndoState] = React.useState(null);
  // undoState = { previousMap, count, timer } | null
  React.useEffect(() => () => {
    if (undoState && undoState.timer) clearTimeout(undoState.timer);
  }, [undoState]);
  const markAllRead = () => {
    try {
      const previousMap = JSON.parse(localStorage.getItem("read-articles") || "{}");
      const newMap = { ...previousMap };
      const ids = (top || []).map(t => t._id || t.id).filter(Boolean);
      ids.forEach(id => { newMap[id] = { ts: Date.now() }; });
      localStorage.setItem("read-articles", JSON.stringify(newMap));
      setReadTop(Object.fromEntries((top || []).map(t => [t.rank, true])));
      if (undoState && undoState.timer) clearTimeout(undoState.timer);
      const timer = setTimeout(() => setUndoState(null), 6000);
      setUndoState({ previousMap, count: ids.length, timer });
    } catch {}
  };
  const undoMarkAll = () => {
    if (!undoState) return;
    clearTimeout(undoState.timer);
    try {
      localStorage.setItem("read-articles", JSON.stringify(undoState.previousMap));
      setReadTop({});
    } catch {}
    setUndoState(null);
  };
  const [viewMode, setViewMode] = React.useState(() => {
    try { return localStorage.getItem("home-view-mode") || "full"; } catch { return "full"; }
  });
  React.useEffect(() => {
    try { localStorage.setItem("home-view-mode", viewMode); } catch {}
  }, [viewMode]);

  const [heroCompact, setHeroCompact] = React.useState(() => {
    try { return localStorage.getItem("cockpit-hero-compact") === "1"; }
    catch { return false; }
  });
  const toggleHeroCompact = () => {
    setHeroCompact(v => {
      const next = !v;
      try { localStorage.setItem("cockpit-hero-compact", next ? "1" : "0"); } catch {}
      try { window.track && window.track("hero_compact_toggled", { state: next ? "compact" : "full" }); } catch {}
      return next;
    });
  };

  const lastVisitTs = React.useMemo(() => {
    try {
      const v = Number(localStorage.getItem("cockpit-last-visit-ts"));
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch { return null; }
  }, []);
  React.useEffect(() => {
    try { localStorage.setItem("cockpit-last-visit-ts", String(Date.now())); } catch {}
  }, []);
  const visitDelta = React.useMemo(() => {
    if (!lastVisitTs) return null;
    const now = Date.now();
    const diffH = (now - lastVisitTs) / 3600000;
    if (diffH < 0.5) return null;
    if (diffH < 18) return { h: Math.round(diffH), kind: "today" };
    return { h: Math.round(diffH), kind: "yesterday" };
  }, [lastVisitTs]);
  const newSinceVisit = React.useMemo(() => {
    if (!lastVisitTs) return null;
    let n = 0;
    (data.top || []).forEach(t => {
      const ts = t.fetch_iso ? new Date(t.fetch_iso).getTime() : null;
      if (ts && ts > lastVisitTs) n++;
    });
    return n;
  }, [lastVisitTs, data.top]);

  const useDeltaHero = !!(visitDelta && visitDelta.h < 18 && newSinceVisit && newSinceVisit > 0);
  const newTopItems = React.useMemo(() => {
    if (!useDeltaHero || !lastVisitTs) return [];
    return (data.top || []).filter(t => {
      const ts = t.fetch_iso ? new Date(t.fetch_iso).getTime() : null;
      return ts && ts > lastVisitTs;
    });
  }, [useDeltaHero, lastVisitTs, data.top]);
  const truncate60 = (s) => {
    if (!s) return "";
    return s.length > 60 ? s.slice(0, 60).trimEnd() + "…" : s;
  };
  React.useEffect(() => {
    if (!useDeltaHero) return;
    try { window.track && window.track("hero_delta_shown", { newSinceVisit, hours: visitDelta.h }); } catch {}
  }, [useDeltaHero]);

  const ageOf = (iso) => {
    if (!iso) return "";
    const captured = new Date(iso);
    if (isNaN(captured.getTime())) return "";
    const days = Math.max(0, Math.floor((Date.now() - captured.getTime()) / 86400000));
    if (days < 2) return "aujourd'hui";
    if (days < 8) return `${days}j`;
    if (days < 60) return `${Math.round(days / 7)} sem.`;
    return `${Math.round(days / 30)} mois`;
  };
  const allRead = (data.top || []).every(t => readTop[t.rank] || snoozedTop[t.rank]);
  const noUnreadGlobal = (stats.unread_total ?? stats.articles_today ?? 0) === 0;
  const isZeroState = allRead && noUnreadGlobal;
  const shownIdeas = React.useMemo(() => {
    if (!isZeroState) return [];
    const all = (window.IDEAS_DATA && window.IDEAS_DATA.ideas) || [];
    return all
      .filter(i => i.status === "incubating" || i.status === "maturing")
      .sort((a, b) => new Date(a.last_touched) - new Date(b.last_touched))
      .slice(0, 2);
  }, [isZeroState]);
  React.useEffect(() => {
    if (!isZeroState) return;
    try { window.track && window.track("zero_state_shown", { ideas_count: shownIdeas.length }); } catch {}
  }, [isZeroState]);

  React.useEffect(() => {
    const n = (data.game_releases || []).length;
    if (n) window.track && window.track("games_brief_shown", { count: n });
  }, [data.game_releases]);

  return (
    <div className="home" data-theme-vibe={theme.id}>
      {/* PAGE HEADER */}
      <header className="ph">
        <div className="ph-left">
          <span className="ph-eyebrow">{date.week} · {date.day_of_year}</span>
          <span className="ph-sep">/</span>
          <strong className="ph-title">Brief du jour</strong>
          <span className="ph-sep">·</span>
          <span className="ph-date">{date.long}</span>
        </div>
        <div className="ph-right">
          <AudioBriefChip macro={macro} />
          <button
            className="ph-chip ph-chip--primary"
            onClick={markAllRead}
          ><Icon name="check" size={13} stroke={2.5} /> Tout marqué lu</button>
        </div>
      </header>

      {morningItems.length > 0 && (
        <div className="home-toggle" role="tablist" aria-label="Vue d'accueil">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "morning"}
            className={`home-toggle-btn ${viewMode === "morning" ? "is-active" : ""}`}
            onClick={() => setViewMode("morning")}
          >Morning Card</button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "full"}
            className={`home-toggle-btn ${viewMode === "full" ? "is-active" : ""}`}
            onClick={() => setViewMode("full")}
          >Brief complet</button>
        </div>
      )}

      <MdtBriefCard releases={data.media_releases || []} onNavigate={onNavigate} />

      <GamesBriefCard releases={data.game_releases || []} onNavigate={onNavigate} />

      {viewMode === "morning" && morningItems.length > 0 ? (
        <MorningCard items={morningItems} onNavigate={onNavigate} />
      ) : (<>

      {/* ── HERO : the macro synthesis ─────────────────────────── */}
      <section className={`hero ${heroCompact ? "is-compact" : ""}`}>
        <div className="hero-frame">
          <button
            className="hero-compact-toggle"
            onClick={toggleHeroCompact}
            title={heroCompact ? "Hero plein format" : "Hero compact"}
            aria-label={heroCompact ? "Étendre le hero" : "Réduire le hero"}
            aria-pressed={heroCompact}
          >
            <Icon name={heroCompact ? "chevron_down" : "chevron_up"} size={12} stroke={2} />
            {heroCompact ? "Plein" : "Compact"}
          </button>
          <div className="hero-col-main">
            <div className="hero-kicker">
              <span className="kicker-dot" />
              {visitDelta ? (
                <>
                  DEPUIS TA DERNIÈRE VISITE — {visitDelta.h}H
                  {newSinceVisit != null && (
                    <>{' '}<span className="hero-kicker-meta">
                      · {newSinceVisit} nouveaux articles · {macro.articles_summarized} au total
                    </span></>
                  )}
                </>
              ) : (
                <>
                  {macro.kicker}
                  <span className="hero-kicker-sep">—</span>
                  <span className="hero-kicker-meta">{macro.articles_summarized} articles synthétisés · lecture {macro.reading_time}</span>
                </>
              )}
            </div>
            {useDeltaHero ? (
              <>
                <h1 className="hero-title">
                  {newSinceVisit} {newSinceVisit === 1 ? "nouveauté" : "nouveautés"} depuis {visitDelta.h}h.
                </h1>
                <ul className="hero-delta-list">
                  {newTopItems.slice(0, 4).map((t, i) => (
                    <li key={t._id || t.id || `delta-${i}`}>
                      <span className="src">{t.source}</span>
                      <span className="ttl">{truncate60(t.title)}</span>
                      {/* Affichait `t.score` — un `94 - i*6` sans référent.
                          La section est au moins une information vraie. */}
                      <span className="score">{t.section}</span>
                    </li>
                  ))}
                  {newTopItems.length > 4 && (
                    <li className="hero-delta-more">+ {newTopItems.length - 4} plus</li>
                  )}
                </ul>
                <p className="hero-body">{macro.body}</p>
                <div className="hero-actions">
                  <button className="btn btn--primary" onClick={() => onNavigate("top")}>
                    {newSinceVisit === 1
                      ? "Lire la nouveauté"
                      : `Lire les ${Math.min(newSinceVisit, 4)} nouveautés`} <Icon name="arrow_right" size={14} stroke={2} />
                  </button>
                  <button className="btn btn--ghost" onClick={() => onNavigate("updates")}>
                    Parcourir les {macro.articles_summarized || 0} articles
                  </button>
                </div>
                <details className="hero-macro-collapse">
                  <summary>Voir le brief macro complet</summary>
                  <h1 className="hero-title">{macro.title}</h1>
                  <p className="hero-body">{macro.body}</p>
                </details>
              </>
            ) : (
              <>
                <h1 className="hero-title">{macro.title}</h1>
                <p className="hero-body">{macro.body}</p>
                <div className="hero-actions">
                  <button className="btn btn--primary" onClick={() => onNavigate("top")}>
                    Lire les 3 incontournables <Icon name="arrow_right" size={14} stroke={2} />
                  </button>
                  <button className="btn btn--ghost" onClick={() => onNavigate("updates")}>
                    Parcourir les {macro.articles_summarized || 0} articles
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="hero-col-side">
            <div className="hero-todo">
              <div className="hero-todo-label">À traiter depuis hier</div>
              <div className="hero-todo-num">{stats.unread_total ?? stats.articles_today}</div>
              <div className="hero-todo-unit">articles · {stats.signals_rising ?? 0} signaux à regarder</div>
              <button className="btn btn--primary btn--sm hero-todo-cta" onClick={() => onNavigate("top")}>
                Commencer la revue <Icon name="arrow_right" size={12} stroke={2} />
              </button>
            </div>
            <div className="hero-meta">
              <div className="hero-meta-item">
                <span className="hero-meta-label">Prochain brief</span>
                <span className="hero-meta-val">{stats.next_brief}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {recentOnly && !useDeltaHero && (
        <div className="hero-recent-microcopy" role="note">
          <span>Mode récent · seuls les articles &lt; 24h sont visibles.</span>
          <button
            type="button"
            className="hero-recent-link"
            onClick={() => { if (typeof setRecentOnly === "function") setRecentOnly(false); }}
          >Voir tout</button>
        </div>
      )}

      {/* ── TOP 3 INCONTOURNABLES ───────────────────────────── */}
      {isZeroState ? (
        <section className="block block--zero">
          <div className="zero-state">
            <div className="zero-state-eyebrow">À jour</div>
            <h2 className="zero-state-title">Tu as fait le tour. Bravo.</h2>
            <p className="zero-state-body">
              Pendant que tu attends le brief de demain matin, voilà 2 idées qui dorment dans ton carnet — peut-être le bon moment pour les creuser.
            </p>
            {shownIdeas.length > 0 && (
              <div className="zero-state-ideas">
                {shownIdeas.map(i => (
                  <button key={i.id} type="button" className="zero-idea" onClick={() => onNavigate("ideas")}>
                    <span className="zero-idea-kicker">{i.kicker || "Idée"}</span>
                    <span className="zero-idea-title">{i.title}</span>
                    <span className="zero-idea-age">en incubation depuis {ageOf(i.captured_at)}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="zero-state-actions">
              <button className="btn btn--ghost btn--sm" onClick={() => onNavigate("ideas")}>
                Ouvrir le carnet <Icon name="arrow_right" size={12} stroke={2} />
              </button>
            </div>
          </div>
        </section>
      ) : (
      <section className="block">
        <div className="block-head">
          <div>
            <div className="section-kicker">Top du jour</div>
            <h2 className="section-title">3 incontournables, classés par l'agent</h2>
          </div>
          <button className="link-more" onClick={() => onNavigate("top")}>
            Tous les incontournables <Icon name="arrow_right" size={12} stroke={2} />
          </button>
        </div>

        <div className="top-grid">
          {top.map((t) => {
            const openArticle = () => {
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
              toggleRead(t.rank);
              window.open(url, "_blank", "noopener");
            };
            const hasUrl = !!(t._url || t.url);
            const ts = t.fetch_iso ? new Date(t.fetch_iso).getTime() : null;
            const isRecent = !!(ts && Date.now() - ts < 86400000);
            return (
            <article
              key={t.rank}
              className={`top-card ${readTop[t.rank] ? "is-read" : t.unread ? "is-unread" : ""} ${snoozedTop[t.rank] ? "is-snoozed" : ""} top-card--rank${t.rank}`}
              data-recent={isRecent ? "1" : "0"}
              onClick={openArticle}
              onContextMenu={(e) => { e.preventDefault(); toggleRead(t.rank); }}
              title={readTop[t.rank] ? "clic-droit pour marquer comme non-lu" : null}
              style={hasUrl ? { cursor: "pointer" } : null}
            >
              <div className="top-card-rail">
                <span className="top-rank">{String(t.rank).padStart(2, "0")}</span>
                {/* Il y avait ici une barre « Score de pertinence » remplie à
                    `94 - i*6` %. Trois derniers articles crawlés, notés 94/88/82
                    par pure arithmétique. Remplacé par la confiance réelle de la
                    sélection, affichée seulement quand elle existe. */}
                {t.picked && t.confidence && (
                  <span className={`top-conf top-conf--${t.confidence}`}
                    title={`Confiance de la sélection : ${TOP_CONF_LABEL[t.confidence]}`}>
                    {TOP_CONF_LABEL[t.confidence]}
                  </span>
                )}
              </div>
              <div className="top-card-body">
                <div className="top-meta">
                  <span className="top-reading">{estimateReadingTime((t.summary || "") + " " + (t.title || ""))}</span>
                  <span className="top-source">{t.source}</span>
                  <span className="top-section">{t.section}</span>
                  <span className="top-date">{t.date}</span>
                  {t.unread && !readTop[t.rank] && <span className="top-unread-dot" />}
                </div>
                <h3 className="top-title">{t.title}</h3>
                {/* Le « pourquoi toi » passe avant le résumé : c'est la seule
                    chose qui justifie que cet article soit là plutôt qu'un autre. */}
                {t.why && <p className="top-why">{t.why}</p>}
                <p className="top-summary">{t.summary}</p>
                <div className="top-card-foot" onClick={(e) => e.stopPropagation()}>
                  <div className="top-tags">
                    {t.tags.map(tag => <span key={tag} className="top-tag">{tag}</span>)}
                  </div>
                  <div className="top-actions">
                    {t.picked && (
                      <span className="top-vote" role="group" aria-label="Cette sélection était-elle bonne ?">
                        <button
                          className={`card-action card-action--up${votes[t._id] === "up" ? " is-on" : ""}`}
                          aria-pressed={votes[t._id] === "up"}
                          aria-label="Bonne sélection"
                          title="Bonne sélection"
                          onClick={() => sendVote(t._id, "up")}>
                          <Icon name="thumbs_up" size={12} stroke={2} />
                        </button>
                        <button
                          className={`card-action card-action--down${votes[t._id] === "down" ? " is-on" : ""}`}
                          aria-pressed={votes[t._id] === "down"}
                          aria-expanded={askReason === t._id}
                          aria-label="Mauvaise sélection"
                          title="Mauvaise sélection"
                          onClick={() => setAskReason(askReason === t._id ? null : t._id)}>
                          <Icon name="thumbs_down" size={12} stroke={2} />
                        </button>
                      </span>
                    )}
                    <button className="card-action card-action--bookmark" aria-label="Garder cet article (bientôt disponible)" title="Sauvegarde — bientôt disponible" disabled>
                      <Icon name="bookmark" size={12} stroke={2} />
                    </button>
                    <button
                      className="card-action card-action--ask"
                      aria-label="Demander à Jarvis à propos de cet article"
                      onClick={(e) => {
                        e.stopPropagation();
                        const prompt = `À propos de "${t.title}" (${t.source}) : ${t.summary}\nMa question : `;
                        try { localStorage.setItem("jarvis-prefill", prompt); } catch {}
                        if (typeof onNavigate === "function") onNavigate("jarvis");
                      }}
                    >
                      <Icon name="message_circle" size={12} stroke={2} />
                    </button>
                    <button
                      className="card-action card-action--snooze"
                      aria-label="Reporter à plus tard"
                      title="Reporter (3 jours)"
                      onClick={(e) => {
                        e.stopPropagation();
                        snoozeCard(t._id || t.id, t.rank);
                      }}
                    >
                      <Icon name="clock" size={12} stroke={2} />
                    </button>
                  </div>
                </div>
                {/* Le motif du rejet, pas seulement le rejet : c'est lui qui
                    permet de réécrire les règles de sélection. Un pouce nu
                    n'apprend presque rien. */}
                {askReason === t._id && (
                  <div className="top-reasons" onClick={(e) => e.stopPropagation()}>
                    <span className="top-reasons-label">Pourquoi&nbsp;?</span>
                    {TOP_DOWN_REASONS.map(r => (
                      <button key={r.key} className="top-reason"
                        onClick={() => sendVote(t._id, "down", r.key)}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
            );
          })}
        </div>
      </section>
      )}

      {/* ── 2-COL : Signaux + Radar gap ─────────────────────── */}
      <section className="block block--two">
        <div className="col col--signals">
          <div className="block-head">
            <div>
              <div className="section-kicker">Signaux faibles · S17</div>
              <h2 className="section-title">Ce qui émerge<br/>cette semaine</h2>
            </div>
            <button className="link-more" onClick={() => onNavigate("signals")}>
              Voir tous <Icon name="arrow_right" size={12} stroke={2} />
            </button>
          </div>
          <div className="sig-grid">
            {signals.slice(0, 4).map((s, i) => <SignalCard key={s.name} signal={s} rank={i} onNavigate={onNavigate} />)}
          </div>
        </div>

        <div className="col col--radar">
          <div className="block-head">
            <div>
              <div className="section-kicker">Radar compétences</div>
              <h2 className="section-title">Ton prochain gap à combler</h2>
            </div>
          </div>
          <div className="radar-box">
            <div className="radar-svg-wrap">
              <RadarSVG axes={radar.axes} size={230} />
            </div>
            <div className="radar-next">
              <div className="radar-next-tag">
                <span className="radar-next-dot" />
                Gap prioritaire
              </div>
              <div className="radar-next-axis">{radar.next_gap.axis}</div>
              <p className="radar-next-reason">{radar.next_gap.reason}</p>
              <button className="btn btn--primary btn--sm" onClick={() => onNavigate("challenges")}>
                {radar.next_gap.action} <Icon name="arrow_right" size={12} stroke={2} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ma semaine strip ─────────────────────────────────── */}
      <section className="block">
        <div className="block-head">
          <div>
            <div className="section-kicker">Ma semaine</div>
            <h2 className="section-title">{week.total_read} articles lus, {week.streak} jours d'affilée</h2>
          </div>
          <button className="link-more" onClick={() => onNavigate("week")}>
            Ouvrir ma semaine <Icon name="arrow_right" size={12} stroke={2} />
          </button>
        </div>
        <div className="hwk-wrap">
          <div className="hwk">
            <div className="hwk-head">
              <span className="hwk-head-label">Articles lus</span>
              <span className="hwk-head-avg">moy. {(week.total_read / 7).toFixed(1)}/jour</span>
            </div>
            <div className="hwk-grid">
              {[0, 5, 10, 15].map(tick => (
                <div key={tick} className="hwk-tick" style={{ bottom: `${(tick / 16) * 100}%` }}>
                  <span className="hwk-tick-label">{tick}</span>
                  <span className="hwk-tick-line" />
                </div>
              ))}
              <div className="hwk-bars">
                {week.days.map((d, i) => {
                  const max = 16;
                  return (
                    <div key={d.day} className={`hwk-col ${i === 1 ? "is-today" : ""} ${d.read === Math.max(...week.days.map(x=>x.read)) ? "is-peak" : ""}`}>
                      <div className="hwk-bar-wrap">
                        <div className="hwk-val">{d.read}</div>
                        <div className="hwk-bar" style={{ height: `${(d.read / max) * 100}%` }} />
                      </div>
                      <div className="hwk-label">{d.day}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="hwk-kpi">
            <div className="hwk-kpi-card">
              <div className="hwk-kpi-card-label">Articles lus</div>
              <div className="hwk-kpi-card-val">{week.total_read}</div>
              <div className="hwk-kpi-card-delta is-up">+{week.compare_last.read.this - week.compare_last.read.last} vs S-1</div>
            </div>
            <div className="hwk-kpi-card">
              <div className="hwk-kpi-card-label">Gardés</div>
              <div className="hwk-kpi-card-val">{week.total_marked}</div>
              <div className="hwk-kpi-card-delta">{Math.round((week.total_marked / week.total_read) * 100)}% du flux</div>
            </div>
            <div className="hwk-kpi-card">
              <div className="hwk-kpi-card-label">Streak veille</div>
              <div className="hwk-kpi-card-val hwk-kpi-card-val--flame"><Icon name="flame" size={20} stroke={1.8} /> {week.streak}<span className="hwk-kpi-card-unit">j</span></div>
              <div className="hwk-kpi-card-delta">record depuis janvier</div>
            </div>
          </div>
        </div>
      </section>

      </>)}

      <footer className="home-foot">
        <span>Brief généré par Gemini Flash-Lite · synthèse hebdo par Claude Haiku</span>
        <span>{stats.cost_month} / {stats.cost_budget} ce mois</span>
      </footer>

      {undoState && (
        <div className="ph-undo-toast" role="status">
          <span>{undoState.count} articles marqués lus</span>
          <button className="ph-undo-btn" onClick={undoMarkAll}>Annuler</button>
        </div>
      )}
    </div>
  );
}

window.Home = Home;
