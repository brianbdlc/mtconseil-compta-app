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
- Accès par invitation courriel (pas de signup public). Deux niveaux de permission stockés dans `profiles.permission_level` : `lecteur` (lecture seule) et `editeur` (lecture + création/modification), lus par le trigger `handle_new_user` depuis `raw_user_meta_data->>'permission_level'` (défaut `lecteur`). **Le bouton « Invite user » du dashboard Supabase n'expose pas de champ metadata** : pour fixer le niveau à l'invitation, passer par l'Auth Admin API (`inviteUserByEmail(email, { data: { permission_level } })`, clé secrète, serveur) — voir `scripts/invite.ts`. Sinon, inviter au dashboard (défaut `lecteur`) puis ajuster le niveau en base. Distinction lecture/écriture portée par **RLS**. « Admin » = humain via dashboard Supabase (pas un rôle stocké) ; la piste d'audit assure la traçabilité.
- Toute phase touchant aux écritures livre des tests Σ débits = Σ crédits (insertion, modif, suppression de ligne).
- Repo : migrations Supabase **additives** uniquement ; projet lié = **DEV** ; jamais de travail direct sur `main` (branche + PR obligatoires).

## Jargon métier
- **CTI** — crédit de taxe sur intrants : TPS/TVQ payée sur les achats, comptabilisée en **actif** (à l'opposé des taxes *perçues*, un passif).
- **Balance âgée** — créances clients réparties en tranches 0-30 / 30-60 / 60-90+ jours, groupées par client.
- **TPS 5 % / TVQ 9,975 %** — taxes de vente québécoises, perçues et payées suivies séparément par code de taxe par ligne.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
