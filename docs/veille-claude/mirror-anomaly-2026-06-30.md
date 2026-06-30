# Anomalie détectée par le Miroir du Soir — 2026-06-30

## Brief matinal Gemini en échec depuis 5 jours consécutifs

Le `daily_briefs` du jour contient une erreur de génération au lieu d'un
résumé exploitable, et ce n'est pas un incident isolé :

| Date | Articles collectés | Résultat |
|---|---|---|
| 2026-06-26 | 44 | `503 UNAVAILABLE` |
| 2026-06-27 | 29 | `503 UNAVAILABLE` |
| 2026-06-28 | 17 | `503 UNAVAILABLE` |
| 2026-06-29 | 26 | `503 UNAVAILABLE` |
| 2026-06-30 | 45 | `503 UNAVAILABLE` |

Message identique à chaque run : *"This model is currently experiencing
high demand. Spikes in demand are usually temporary. Please try again
later."*

### Pourquoi c'est un signal fort

- La collecte d'articles fonctionne (17 à 45 articles/jour, volume normal) —
  le problème est localisé à l'appel Gemini Flash-Lite de génération du
  brief, pas à la collecte RSS.
- "Spikes in demand are usually temporary" ne tient plus après 5 jours
  identiques à la même étape : ça ressemble plus à un quota épuisé, une clé
  API invalide/expirée, ou un changement côté modèle (nom/version
  dépréciée) qu'à une vraie saturation ponctuelle de l'API Gemini.
- Effet de bord comportemental détecté côté usage : sur la même fenêtre
  (27→30 juin), zéro action créatrice enregistrée côté cockpit (aucune
  idée créée/déplacée, aucun challenge complété, aucun bump de compétence,
  aucune recherche). Corrélation possible : sans brief du matin, Jean perd
  le point d'entrée éditorial qui oriente sa session.

### Recommandation

Vérifier côté pipeline `main.py` (génération `daily_briefs`, Gemini
Flash-Lite) : quota journalier, validité de la clé API, nom du modèle
appelé. Si le quota free tier (1000 req/jour) est temporairement
restructuré ou la clé a changé de statut, c'est la piste la plus probable
vu la régularité de l'échec.
