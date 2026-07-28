# Miroir du soir — anomalie détectée (2026-07-28)

> Note générée automatiquement par le run Miroir du Soir. Pas une veille produit — un signal comportemental détecté en croisant `daily_mirror` sur les 4 derniers jours.

## Constat

Depuis le **25 juillet**, 4 jours consécutifs sans le moindre `link_clicked` en base (`usage_events`), malgré une navigation active (6 à 15 sections ouvertes/jour) :

| Date | Sections ouvertes | Liens cliqués | Idées créées/déplacées | Recherches |
|---|---|---|---|---|
| 2026-07-25 | 1 (mediatheque) | 0 | 0 | 0 |
| 2026-07-26 | 7 (dont ideas ×1, opps ×2) | 0 | 0 | 0 |
| 2026-07-27 | 15 (dont ideas ×1, opps ×1, search ×1) | 0 | 0 | 0 |
| 2026-07-28 | 6 (mediatheque ×4, jarvis-lab ×1, jobs ×1) | 0 | 0 | 0 |

Sur 2 de ces 4 jours (26, 27), la section **Idées** et/ou **Opportunités** a été ouverte sans qu'aucune idée ne soit créée ou déplacée de statut.

## Lecture

Pas une panne de télémétrie — `section_opened` continue d'arriver normalement, seuls les events d'engagement profond (clic, recherche, action business) sont à zéro. Ressemble à une consultation de surface (scroll/parcours) sans lecture ni action, sur une fenêtre suffisamment longue pour sortir du bruit d'une journée isolée.

## Pas d'action prise

Ce fichier est une trace, pas une alerte à traiter — le Miroir du soir n'a pas de mandat pour agir dessus. Signal transmis à Jean via le paragraphe "point d'attention" du miroir du 28/07.
