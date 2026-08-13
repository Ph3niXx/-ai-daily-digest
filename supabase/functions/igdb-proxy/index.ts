// Proxy de recherche IGDB pour l'onglet Gaming.
// IGDB refuse les requetes navigateur (CORS) et exige un client secret :
// la recherche front ne peut donc pas l'appeler directement.
//
// Ce fichier NE reproduit PAS le pattern de l'ancienne jsearch-proxy,
// supprimee le 2026-08-13 : elle portait sa cle en dur et tournait sans
// verification de JWT, donc appelable par quiconque devinait son slug.
// Ici : secret via Deno.env, verify_jwt a true, CORS borne a l'origine Pages.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = "https://ph3nixx.github.io";
const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const id = Deno.env.get("TWITCH_CLIENT_ID");
  const secret = Deno.env.get("TWITCH_CLIENT_SECRET");
  if (!id || !secret) {
    return new Response(JSON.stringify({ error: "secrets absents" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return new Response(JSON.stringify([]),
      { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  try {
    const token = await getToken(id, secret);
    const body = `search "${q.replace(/"/g, "")}"; ` +
      `fields id,name,first_release_date,cover.image_id,collections,genres.name,platforms.name,` +
      `release_dates.human,release_dates.date; limit 12;`;
    const r = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: { "Client-ID": id, Authorization: `Bearer ${token}` },
      body,
    });
    if (!r.ok) throw new Error(`igdb ${r.status}`);
    const games = await r.json();

    const collIds = [...new Set(games.flatMap((g: any) => g.collections ?? []))];
    let names: Record<number, string> = {};
    if (collIds.length) {
      const cr = await fetch("https://api.igdb.com/v4/collections", {
        method: "POST",
        headers: { "Client-ID": id, Authorization: `Bearer ${token}` },
        body: `fields id,name; where id = (${collIds.join(",")}); limit 50;`,
      });
      if (cr.ok) for (const c of await cr.json()) names[c.id] = c.name;
    }

    const out = games.map((g: any) => {
      const coll = (g.collections ?? [])[0] ?? null;
      const rd = (g.release_dates ?? []).slice().sort(
        (a: any, b: any) => (a.date ?? 0) - (b.date ?? 0))[0];
      return {
        id: g.id,
        name: g.name,
        cover_url: g.cover?.image_id
          ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
          : null,
        release_human: rd?.human ?? null,
        first_release_date: g.first_release_date
          ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10) : null,
        collection_id: coll,
        collection_name: coll ? (names[coll] ?? null) : null,
        genres: (g.genres ?? []).map((x: any) => x.name),
        platforms: (g.platforms ?? []).map((x: any) => x.name),
      };
    });
    return new Response(JSON.stringify(out),
      { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
