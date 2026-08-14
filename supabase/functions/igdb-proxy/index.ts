// Proxy IGDB pour l'onglet Gaming.
// IGDB refuse les requetes navigateur (CORS) et exige un client secret :
// le front ne peut donc pas l'appeler directement.
//
// Deux modes, meme mapper :
//   ?q=<texte>      recherche de jeux (ajout d'un jeu console a la main)
//   ?collection=<id> les titres PAS ENCORE SORTIS d'une licence
//
// Le second existe parce que le pipeline ne parcourt les collections qu'a
// 08:30 UTC : sans lui, une licence qu'on vient de suivre n'a aucun evenement
// et le rail « A venir » reste vide jusqu'au lendemain.
//
// Ce fichier NE reproduit PAS le pattern de l'ancienne jsearch-proxy,
// supprimee le 2026-08-13 : elle portait sa cle en dur et tournait sans
// verification de JWT, donc appelable par quiconque devinait son slug.
// Ici : secret via Deno.env, verify_jwt a true, CORS borne a l'origine Pages.
// Lecture seule : cette fonction n'ecrit RIEN en base — les insertions sont
// faites par le front avec le JWT de l'utilisateur, donc soumises a la RLS.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = "https://ph3nixx.github.io";
const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const COVER = "https://images.igdb.com/igdb/image/upload/t_cover_big/";

// Reference : pipelines/igdb_map.py (STATUS, PRECISION, _earliest_release).
// Les deux tables sont dupliquees ici parce qu'une Edge Function Deno ne peut
// pas importer le module Python. Elles ne bougent que si IGDB change ses enums.
const STATUS: Record<number, string> = {
  0: "released", 2: "alpha", 3: "beta", 4: "early_access",
  5: "offline", 6: "cancelled", 7: "rumored", 8: "delisted",
};
const PRECISION: Record<number, string> = {
  0: "day", 1: "month", 2: "year",
  3: "quarter", 4: "quarter", 5: "quarter", 6: "quarter", 7: "tbd",
};

const FIELDS = "fields id,name,slug,summary,status,hypes,first_release_date," +
  "cover.image_id,collections,genres.name,platforms.name," +
  "release_dates.human,release_dates.date,release_dates.date_format;";

// Le token applicatif Twitch vit ~60 jours : le redemander a chaque requete
// brulerait du quota pour rien. Cache en memoire, renouvele a l'expiration.
let cached: { token: string; expires: number } | null = null;

async function getToken(id: string, secret: string): Promise<string> {
  const now = Date.now();
  if (cached && cached.expires > now + 60_000) return cached.token;
  const u = new URL("https://id.twitch.tv/oauth2/token");
  u.searchParams.set("client_id", id);
  u.searchParams.set("client_secret", secret);
  u.searchParams.set("grant_type", "client_credentials");
  const r = await fetch(u, { method: "POST" });
  if (!r.ok) throw new Error(`twitch ${r.status}`);
  const j = await r.json();
  cached = { token: j.access_token, expires: now + (j.expires_in ?? 3600) * 1000 };
  return cached.token;
}

function isoDay(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

// Un jeu IGDB -> la forme que le front ecrit dans game_titles
// (cockpit/lib/games-view.js::titleRow). Meme regle que _earliest_release cote
// pipeline : c'est release_dates qui porte la PRECISION, first_release_date ne
// la porte pas. Sans elle, un jeu annonce « 2027 » s'afficherait
// « 1 janvier 2027 » — une date inventee.
function mapGame(g: any, names: Record<number, string>) {
  const coll = (g.collections ?? [])[0] ?? null;
  const dated = (g.release_dates ?? [])
    .filter((d: any) => d.date)
    .sort((a: any, b: any) => a.date - b.date);
  const first = dated[0];
  return {
    id: g.id,
    name: g.name,
    slug: g.slug ?? null,
    summary: (g.summary ?? "").trim().slice(0, 2000) || null,
    cover_url: g.cover?.image_id ? `${COVER}${g.cover.image_id}.jpg` : null,
    genres: (g.genres ?? []).map((x: any) => x.name),
    platforms: (g.platforms ?? []).map((x: any) => x.name),
    // IGDB omet `status` sur la majorite des jeux sortis : l'absence vaut
    // released, comme cote pipeline. C'est la DATE qui decide de « a venir »,
    // jamais ce champ (voir games-view.js::isUpcoming).
    igdb_status: STATUS[g.status] ?? "released",
    first_release_date: first ? isoDay(first.date)
      : (g.first_release_date ? isoDay(g.first_release_date) : null),
    release_human: first?.human ?? null,
    // Sous-affirmer (year) est sans danger, sur-affirmer (day) invente.
    release_precision: first ? (PRECISION[first.date_format] ?? "tbd")
      : (g.first_release_date ? "year" : "tbd"),
    hypes: g.hypes ?? null,
    collection_id: coll,
    collection_name: coll ? (names[coll] ?? null) : null,
  };
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload),
    { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// `verify_jwt: true` garantit que la passerelle a valide la SIGNATURE du jeton,
// pas que l'appelant est un utilisateur connecte : la publishable key du projet
// — publique, en dur dans cockpit/lib/supabase.js, dans un depot public — passe
// ce filtre. Verifie en live le 2026-08-14 : elle seule suffisait a obtenir une
// reponse complete. Ce n'etait pas la faille de jsearch-proxy (aucune cle en
// dur ici, aucune ecriture en base, aucun quota mensuel a epuiser), mais
// c'etait une porte ouverte sur le quota IGDB de l'utilisateur.
//
// On lit donc le role porte par le jeton. Le decoder sans en revalider la
// signature est sur ICI ET SEULEMENT ICI : la passerelle l'a deja fait en
// amont, un jeton falsifie n'atteint jamais ce code.
function isAuthenticatedUser(req: Request): boolean {
  const raw = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const parts = raw.split(".");
  if (parts.length !== 3) return false;   // sb_publishable_… n'est pas un JWT
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
    return payload.role === "authenticated";
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (!isAuthenticatedUser(req)) return json({ error: "authentification requise" }, 403);

  const id = Deno.env.get("TWITCH_CLIENT_ID");
  const secret = Deno.env.get("TWITCH_CLIENT_SECRET");
  if (!id || !secret) return json({ error: "secrets absents" }, 500);

  const params = new URL(req.url).searchParams;
  const collection = params.get("collection");
  const q = (params.get("q") || "").trim();

  try {
    const token = await getToken(id, secret);
    const igdb = (endpoint: string, body: string) =>
      fetch(`https://api.igdb.com/v4/${endpoint}`, {
        method: "POST",
        headers: { "Client-ID": id, Authorization: `Bearer ${token}` },
        body,
      });

    // ── Mode collection : les titres pas encore sortis d'une licence ──
    if (collection !== null) {
      const cid = Number(collection);
      if (!Number.isInteger(cid) || cid <= 0) return json([]);
      // Pre-filtre serveur, pas verdict : on remonte les titres dates dans le
      // futur ET ceux sans date du tout (annonces sans calendrier). C'est
      // isUpcoming(), cote front, qui tranche ensuite — un jeu peut avoir un
      // first_release_date absent au niveau racine mais date dans son tableau
      // release_dates, et un titre annule doit sortir meme date en 2027.
      const midnight = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);
      const r = await igdb("games",
        `${FIELDS} where collections = (${cid}) & ` +
        `(first_release_date > ${midnight} | first_release_date = null); ` +
        `sort hypes desc; limit 20;`);
      if (!r.ok) throw new Error(`igdb ${r.status}`);
      return json((await r.json()).map((g: any) => mapGame(g, {})));
    }

    // ── Mode recherche ────────────────────────────────────────────────
    if (q.length < 2) return json([]);
    const r = await igdb("games", `search "${q.replace(/"/g, "")}"; ${FIELDS} limit 12;`);
    if (!r.ok) throw new Error(`igdb ${r.status}`);
    const games = await r.json();

    const collIds = [...new Set(games.flatMap((g: any) => g.collections ?? []))];
    const names: Record<number, string> = {};
    if (collIds.length) {
      const cr = await igdb("collections",
        `fields id,name; where id = (${collIds.join(",")}); limit 50;`);
      if (cr.ok) for (const c of await cr.json()) names[c.id] = c.name;
    }
    return json(games.map((g: any) => mapGame(g, names)));
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
});
