# App de comptabilité MT Conseil

## Stack
Next.js (App Router) + Supabase (Postgres, Auth, Storage, Edge Functions, pg_cron).

## Documents projet
Toujours lire ces documents avant de coder :
- @docs/PRD.md — pourquoi et quoi du produit
- @docs/PLAN.md — phases d'implémentation et user stories
- @docs/DESIGN.md — système design et direction visuelle

## Système design
Toujours lire DESIGN.md avant toute décision visuelle ou UI.
Polices, couleurs, espacements et direction esthétique y sont définis.
Ne pas dévier sans validation explicite.
En mode QA, signaler tout code qui ne respecte pas DESIGN.md.

## Conventions
- Partie double garantie **au niveau BD** (trigger deferred, Σ débits = Σ crédits) sur INSERT/UPDATE/DELETE — jamais seulement en UI. On n'efface jamais une ligne seule : on contrepasse l'écriture complète.
- Passé immuable : une période clôturée est en lecture seule ; toute correction passe par une écriture d'ajustement dans la période courante.
- Verrou optimiste (version/horodatage) sur chaque `journal_entries` ; une modif sur version périmée est rejetée.
- Ingestion = l'app *tire* (pull) le Google Sheet ; pas de webhook, pas d'endpoint exposé. Trigger et anti-doublon restent côté n8n.
- Deux rôles (`operateur`, `contact_mt`) à capacité d'édition **identique** — aucune restriction d'accès entre eux ; la piste d'audit assure la traçabilité.
- Toute phase touchant aux écritures livre des tests Σ débits = Σ crédits (insertion, modif, suppression de ligne).
- Repo : migrations Supabase **additives** uniquement ; projet lié = **DEV** ; jamais de travail direct sur `main` (branche + PR obligatoires).

## Jargon métier
- **CTI** — crédit de taxe sur intrants : TPS/TVQ payée sur les achats, comptabilisée en **actif** (à l'opposé des taxes *perçues*, un passif).
- **Balance âgée** — créances clients réparties en tranches 0-30 / 30-60 / 60-90+ jours, groupées par client.
- **TPS 5 % / TVQ 9,975 %** — taxes de vente québécoises, perçues et payées suivies séparément par code de taxe par ligne.
