// Tests du module de présentation Gaming (JS pur, sans DOM).
// Run: node tests/test_games_view.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const V = require(join(here, "..", "cockpit", "lib", "games-view.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

// ── buildLibrary : la regle centrale du lot ──────────────────
// game_titles contient les jeux de l'utilisateur ET les titres freres
// decouverts dans les collections. Seuls les premiers sont sa bibliotheque.
const TITLES = [
  { id: "t1", igdb_id: 1, name: "Civilization VI", steam_appid: 289070, franchise_id: "f1", genres: ["Strategy"], time_to_beat_minutes: 3000 },
  { id: "t2", igdb_id: 2, name: "Civ VI: Babylon Pack", steam_appid: null, franchise_id: "f1", genres: ["Strategy"] },
  { id: "t3", igdb_id: 3, name: "Silksong", steam_appid: null, franchise_id: "f2", genres: ["Platform"] },
  { id: "t4", igdb_id: 4, name: "Mass Effect 2", steam_appid: 24980, franchise_id: "f3", genres: ["RPG"] },
  // t5 : titre avec steam_appid mais SANS entree dans SNAP. Scenario reel = jeu
  // achete hier, appid rempli dans IGDB avant que le pipeline de snapshot
  // n'ait couru. Le code doit le garder ET lui mettre minutes: 0, jamais NaN.
  { id: "t5", igdb_id: 5, name: "Acheté hier", steam_appid: 111111, franchise_id: "f4", genres: [] },
];
const PROGRESS = [
  { title_id: "t3", status: "wishlist", rating: null, platform: null },
  { title_id: "t4", status: "finished", rating: 92, platform: "PC" },
];
const SNAP = [
  { appid: 289070, playtime_forever_minutes: 6733, playtime_2weeks_minutes: 0 },
  { appid: 24980, playtime_forever_minutes: 1427, playtime_2weeks_minutes: 120 },
  { appid: 999999, playtime_forever_minutes: 50, playtime_2weeks_minutes: 0 },
];

const lib = V.buildLibrary(TITLES, PROGRESS, SNAP);
check("bibliotheque = steam_appid OU progress, jamais les freres de collection",
      lib.map(c => c.t.id).sort(), ["t1", "t3", "t4", "t5"]);
check("le DLC sans appid ni progress est exclu",
      lib.some(c => c.t.id === "t2"), false);
check("les heures Steam sont jointes par appid",
      lib.find(c => c.t.id === "t1").minutes, 6733);
check("un titre sans appid n'a pas d'heures",
      lib.find(c => c.t.id === "t3").minutes, 0);
check("heures 14 jours jointes",
      lib.find(c => c.t.id === "t4").minutes2w, 120);
check("un appid Steam sans titre IGDB n'invente pas de carte",
      lib.some(c => c.minutes === 50), false);
check("titre avec appid mais sans snapshot = 0 minutes",
      lib.find(c => c.t.id === "t5").minutes, 0);

// ── statusOf : declare par l'utilisateur, jamais deduit ──────
check("statut declare gagne", V.statusOf(lib.find(c => c.t.id === "t4")), "finished");
check("statut wishlist", V.statusOf(lib.find(c => c.t.id === "t3")), "wishlist");
// 6733 minutes de jeu ne suffisent PAS a declarer « fini » : Steam ne sait pas.
check("jeu joue mais non declare => non qualifie",
      V.statusOf(lib.find(c => c.t.id === "t1")), "unqualified");
check("libelle de statut", V.STATUS_LABELS.dropped, "Lâché");

// ── tri ──────────────────────────────────────────────────────
check("tri par heures decroissantes",
      V.sortLibrary(lib, "hours").map(c => c.t.id), ["t1", "t4", "t5", "t3"]);
check("tri par nom",
      V.sortLibrary(lib, "name").map(c => c.t.id), ["t5", "t1", "t4", "t3"]);
check("tri par note, non notes en dernier",
      V.sortLibrary(lib, "rating").map(c => c.t.id), ["t4", "t5", "t1", "t3"]);

// ── recherche locale ─────────────────────────────────────────
check("recherche insensible a la casse", V.matchesQuery(lib.find(c => c.t.id === "t1"), "civ"), true);
check("recherche insensible aux accents",
      V.matchesQuery({ t: { name: "Pokémon" }, prog: null }, "pokemon"), true);
check("recherche vide accepte tout", V.matchesQuery(lib[0], "   "), true);
check("recherche qui ne matche pas", V.matchesQuery(lib.find(c => c.t.id === "t1"), "zelda"), false);

// ── filtre par statut ────────────────────────────────────────
check("filtre sur un statut",
      V.filterByStatus(lib, ["finished"]).map(c => c.t.id), ["t4"]);
check("filtre vide = tout",
      V.filterByStatus(lib, []).length, 4);

// ── rail « A venir » ─────────────────────────────────────────
const RELEASES = [
  { id: "r1", title_id: "t3", franchise_id: "f2", title: "À venir : Silksong", event_date: "2026-09-04", acknowledged: false },
  { id: "r2", title_id: "t2", franchise_id: "f1", title: "À venir : Babylon", event_date: null, acknowledged: false },
  { id: "r3", title_id: "t1", franchise_id: "f1", title: "Sorti : Civ VI", event_date: "2016-10-21", acknowledged: true },
];
const BY_ID = Object.fromEntries(TITLES.map(t => [t.id, t]));
const FR = { f1: { id: "f1", name: "Civilization" }, f2: { id: "f2", name: "Hollow Knight" } };
const up = V.buildUpcoming(RELEASES, BY_ID, FR);
check("les evenements acquittes sortent du rail", up.map(i => i.id), ["r1", "r2"]);
check("les dates connues passent avant les inconnues", up[0].id, "r1");
check("le rail porte le nom de la licence", up[0].licence, "Hollow Knight");
check("le rail porte le nom du jeu, pas le libelle d'evenement", up[0].name, "Silksong");

// Repli quand title_id ne resout pas (ligne heritee, ou ecrite par un client
// qui n'a pas encore recharge le JS). Il doit retirer les libelles CONNUS et
// rien d'autre : un nom legitime contenant « : » ne doit pas etre ampute.
const orphan = (title) => V.buildUpcoming(
  [{ id: "r9", title_id: "inconnu", franchise_id: "f1", title, acknowledged: false }], {}, FR)[0].name;
check("repli : le prefixe herite est retire", orphan("À venir : Black Myth: Zhong Kui"), "Black Myth: Zhong Kui");
check("repli : les 3 autres libelles aussi", [orphan("Sorti : Civ VI"), orphan("Annulé : X"), orphan("Date annoncée : Y")], ["Civ VI", "X", "Y"]);
check("repli : un nom avec deux-points reste entier", orphan("Persona 5 : Royal"), "Persona 5 : Royal");
check("repli : un nom deja nu est rendu tel quel", orphan("Silksong"), "Silksong");

// ── libelles ─────────────────────────────────────────────────
check("heures : moins d'une heure", V.hoursLabel(45), "45 min");
check("heures : arrondi", V.hoursLabel(6733), "112 h");
check("heures : zero", V.hoursLabel(0), "jamais lancé");
check("duree pour finir", V.ttbLabel(3000), "≈ 50 h pour finir");
check("duree inconnue", V.ttbLabel(null), null);

// ── suggestion « tu y as joué » ──────────────────────────────
// Steam suggere, l'utilisateur declare : on ne fait que proposer.
check("suggere un jeu joue recemment et non declare en cours",
      V.suggestPlaying(lib).map(c => c.t.id), ["t4"]);

// ── plateforme : ou TU possedes le jeu, pas ou il existe ─────
// Piege ecarte volontairement : game_titles.platforms (IGDB) liste les
// plateformes ou le jeu EXISTE. Filtrer dessus afficherait sous « Switch »
// 19 jeux possedes sur Steam qui sortent aussi sur Switch — une reponse a
// une question que personne ne pose. La declaration de l'utilisateur fait
// foi, l'appartenance Steam sert de repli.
const pcSteam   = { t: { id: "p1", steam_appid: 620, platforms: ["PC (Microsoft Windows)", "Nintendo Switch"] }, prog: null };
const switchDec = { t: { id: "p2", steam_appid: null, platforms: ["Nintendo Switch"] }, prog: { platform: "Switch" } };
const steamMaisJoueSwitch = { t: { id: "p3", steam_appid: 42, platforms: [] }, prog: { platform: "Switch" } };
const inconnu   = { t: { id: "p4", steam_appid: null, platforms: ["PlayStation 5"] }, prog: { status: "wishlist" } };

check("appartenance Steam => PC", V.platformOf(pcSteam), "PC");
check("plateforme declaree respectee", V.platformOf(switchDec), "Switch");
// L'utilisateur peut posseder sur Steam et jouer sur Switch : sa declaration gagne.
check("declaration prime sur l'appartenance Steam", V.platformOf(steamMaisJoueSwitch), "Switch");
check("ni appartenance ni declaration => inconnu", V.platformOf(inconnu), null);
// Un jeu qui EXISTE sur PS5 mais que rien ne rattache a PS5 n'y est pas classe.
check("les plateformes IGDB ne classent jamais", V.platformOf(inconnu) === "PlayStation", false);

const parPlateforme = [pcSteam, switchDec, steamMaisJoueSwitch, inconnu];
check("filtre sur une plateforme",
      V.filterByPlatform(parPlateforme, ["Switch"]).map(c => c.t.id), ["p2", "p3"]);
check("filtre sur plusieurs plateformes",
      V.filterByPlatform(parPlateforme, ["PC", "Switch"]).map(c => c.t.id), ["p1", "p2", "p3"]);
check("filtre vide = tout", V.filterByPlatform(parPlateforme, []).length, 4);
check("les non classes ne sortent sous aucune plateforme",
      V.filterByPlatform(parPlateforme, ["PC", "PlayStation", "Xbox", "Switch"]).map(c => c.t.id),
      ["p1", "p2", "p3"]);

// ── isUpcoming : replique de pipelines/igdb_map.py::is_upcoming ──────
// MEMES CAS que tests/test_igdb_map.py, volontairement. Les deux
// implementations ecrivent game_releases (le pipeline chaque nuit, le front a
// l'ajout d'un jeu) : si elles divergent, le rail affichera une chose et le
// Brief une autre. Toute modification de l'une doit se refleter ici.
const TODAY = "2026-08-13";
const ttl = (id, over) => Object.assign(
  { igdb_id: id, name: `Jeu ${id}`, igdb_status: "released", first_release_date: null }, over || {});

check("date future + statut released => a venir",
      V.isUpcoming(ttl(1, { first_release_date: "2027-05-01" }), TODAY), true);
check("date passee => pas a venir",
      V.isUpcoming(ttl(2, { first_release_date: "2011-05-01" }), TODAY), false);
check("date du jour => pas a venir (deja sorti)",
      V.isUpcoming(ttl(3, { first_release_date: TODAY }), TODAY), false);
check("cancelled => jamais a venir",
      V.isUpcoming(ttl(4, { igdb_status: "cancelled", first_release_date: "2027-05-01" }), TODAY), false);
check("delisted => jamais a venir", V.isUpcoming(ttl(5, { igdb_status: "delisted" }), TODAY), false);
check("offline => jamais a venir", V.isUpcoming(ttl(6, { igdb_status: "offline" }), TODAY), false);
check("sans date + hypes suffisants => a venir",
      V.isUpcoming(ttl(7, { hypes: 64 }), TODAY), true);
check("sans date + hypes faibles => pas a venir", V.isUpcoming(ttl(8, { hypes: 3 }), TODAY), false);
check("sans date + hypes absents => pas a venir", V.isUpcoming(ttl(9), TODAY), false);
// Cas reel : IGDB laisse status a NULL sur la majorite de son catalogue. Le
// front ecrit alors null la ou le pipeline ecrit « released » — la date doit
// decider dans les deux cas.
check("statut absent => la date decide quand meme",
      V.isUpcoming({ igdb_id: 10, first_release_date: "2027-01-01" }, TODAY), true);

// ── titleRow : les colonnes de game_titles ───────────────────────────
const igdbGame = {
  id: 366896, name: "Fire Emblem: Fortune's Weave", slug: "fire-emblem-fortunes-weave",
  summary: "…", cover_url: "https://images.igdb.com/x.jpg", genres: ["Tactical"],
  platforms: ["Nintendo Switch 2"], igdb_status: "released",
  first_release_date: "2026-09-17", release_human: "Sep 17, 2026",
  release_precision: "day", hypes: 36, collection_id: 303,
};
const row = V.titleRow(igdbGame, "f-abc");
check("titleRow rattache la franchise", row.franchise_id, "f-abc");
check("titleRow porte l'igdb_id", row.igdb_id, 366896);
check("titleRow porte la precision", row.release_precision, "day");
check("titleRow porte les hypes", row.hypes, 36);
// collection_id n'est PAS une colonne de game_titles : l'y envoyer ferait
// echouer l'insert PostgREST en 400.
check("titleRow n'emet pas de colonne inconnue",
      Object.keys(row).sort().join(","),
      "cover_url,first_release_date,franchise_id,genres,hypes,igdb_id,igdb_status,name," +
      "platforms,release_human,release_precision,slug,summary");
check("titleRow sans hypes => null", V.titleRow({ id: 1, name: "X" }, "f").hypes, null);
check("titleRow sans genres => tableau vide", V.titleRow({ id: 1, name: "X" }, "f").genres, []);

// ── announcedRows : les lignes game_releases ─────────────────────────
const saved = [
  { id: "s1", igdb_id: 1, franchise_id: "f1", name: "Wolverine", igdb_status: "released", first_release_date: "2027-05-01" },
  { id: "s2", igdb_id: 2, franchise_id: "f1", name: "Vieux", igdb_status: "released", first_release_date: "2011-05-01" },
  { id: "s3", igdb_id: 3, franchise_id: "f1", name: "Annule", igdb_status: "cancelled", first_release_date: "2027-01-01" },
];
const ann = V.announcedRows(saved, TODAY);
check("announcedRows ne retient que ce qui est a venir", ann.map(r => r.title_id), ["s1"]);
check("announcedRows type d'evenement", ann[0].event_type, "announced");
// Libelle identique a upcoming_events() cote pipeline : c'est ce qui garantit
// que le sync de la nuit retombe sur la meme ligne (UNIQUE title_id,event_type)
// au lieu d'en creer une seconde. Le nom nu depuis le 2026-08-19 : le type
// d'evenement vit dans event_type, le repeter en francais dans title le
// dupliquait a l'ecran a cote de son propre tag.
check("announcedRows libelle = le nom nu", ann[0].title, "Wolverine");
check("announcedRows porte la date", ann[0].event_date, "2027-05-01");
check("announcedRows porte la franchise", ann[0].franchise_id, "f1");
check("announcedRows sur liste vide", V.announcedRows([], TODAY), []);
// Une ligne sans id de base ne peut pas etre referencee par game_releases :
// l'ecrire produirait un title_id null, donc un evenement orphelin que le rail
// afficherait sans jamais pouvoir le resoudre.
check("announcedRows ignore un titre non enregistre",
      V.announcedRows([{ igdb_id: 9, franchise_id: "f1", name: "Pas sauve", first_release_date: "2027-05-01" }], TODAY), []);

// ── mergeById : etat local du panel ──────────────────────────────────
check("mergeById ajoute les lignes inedites",
      V.mergeById([{ id: "a", n: 1 }], [{ id: "b", n: 2 }]).map(r => r.id), ["a", "b"]);
// Un upsert renvoie aussi les lignes deja presentes : concatener creerait un
// doublon dans la bibliotheque et dans le rail.
check("mergeById ne duplique pas une ligne connue",
      V.mergeById([{ id: "a", n: 1 }], [{ id: "a", n: 9 }]).length, 1);
check("mergeById garde la valeur la plus fraiche",
      V.mergeById([{ id: "a", n: 1 }], [{ id: "a", n: 9 }])[0].n, 9);
check("mergeById fusionne au lieu de remplacer",
      V.mergeById([{ id: "a", n: 1, keep: true }], [{ id: "a", n: 9 }])[0].keep, true);
check("mergeById tolere un etat local nul", V.mergeById(null, [{ id: "a" }]).map(r => r.id), ["a"]);
check("mergeById ignore une ligne sans id", V.mergeById([], [{ n: 1 }]), []);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
