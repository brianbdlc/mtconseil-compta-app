-- Phase 2 : cœur du grand livre en partie double
--
-- Trois tables (voir docs/PLAN.md « Cœur grand livre ») :
--   - accounts        : plan comptable (5 classes), plat pour le MVP.
--   - journal_entries : en-tête d'écriture (date, description, source, auteur, version).
--   - journal_lines   : lignes (compte, débit/crédit).
--
-- Invariant partie double (Σ débits = Σ crédits, ≥ 2 lignes) garanti au niveau BD
-- par un trigger deferred — voir la migration suivante. Les montants sont en
-- numeric(14,2) (décimal exact ; jamais de float en compta). Les mutations passent
-- exclusivement par des RPC SECURITY DEFINER (migration RPC/RLS) : ici on ne pose
-- que les tables, types, contraintes et index.

-- 1. Types énumérés
--    Vocabulaire aligné sur le PRD (actifs, passifs, capitaux propres, revenus,
--    dépenses) ; labels ASCII sans accent. Le « sens normal » d'un compte
--    (débiteur/créditeur) se DÉDUIT de la classe, il n'est pas stocké :
--      débiteur  = actif, depenses
--      créditeur = passif, capitaux_propres, revenus
create type public.account_class as enum (
  'actif',
  'passif',
  'capitaux_propres',
  'revenus',
  'depenses'
);

-- Source d'une écriture. `manuel` seulement en Phase 2 ; extensible additivement
-- (ex. `n8n` en Phase 5) via `alter type ... add value`.
create type public.entry_source as enum ('manuel');

-- 2. Plan comptable
create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  number      text not null unique,
  name        text not null,
  class       public.account_class not null,
  is_active   boolean not null default true,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint accounts_number_not_blank check (length(btrim(number)) > 0),
  constraint accounts_name_not_blank check (length(btrim(name)) > 0)
);

comment on table public.accounts is
  'Plan comptable (5 classes). Plat pour le MVP ; un parent_id pourra être ajouté additivement pour les regroupements d''états (Phase 11). On désactive un compte (is_active), on ne le supprime jamais (intégrité des lignes historiques).';
comment on column public.accounts.class is
  'Classe comptable. Sens normal déduit : actif/depenses = débiteur ; passif/capitaux_propres/revenus = créditeur.';

-- 3. En-tête d'écriture
create table public.journal_entries (
  id                uuid primary key default gen_random_uuid(),
  entry_date        date not null,
  description       text,
  source            public.entry_source not null default 'manuel',
  created_by        uuid references public.profiles (id),
  version           integer not null default 1,
  reverses_entry_id uuid references public.journal_entries (id),
  reversed_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Une écriture ne peut pas contrepasser deux fois la même originale.
  constraint journal_entries_reverses_unique unique (reverses_entry_id)
);

comment on table public.journal_entries is
  'En-tête d''écriture. `version` = verrou optimiste (comparé et incrémenté dans update_journal_entry). `reverses_entry_id` = lien vers l''écriture contrepassée ; `reversed_at` marque l''originale annulée. Toute mutation passe par les RPC SECURITY DEFINER.';
comment on column public.journal_entries.version is
  'Verrou optimiste : une modification sur une version périmée est rejetée par update_journal_entry.';

-- 4. Lignes d'écriture
--    debit/credit ≥ 0, exactement un côté non nul, jamais une ligne vide.
--    L'équilibre Σ débits = Σ crédits (et ≥ 2 lignes) est vérifié par le trigger
--    deferred de la migration suivante — pas ici (une contrainte de ligne ne peut
--    pas voir les autres lignes de l''écriture).
create table public.journal_lines (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.journal_entries (id),
  line_no     integer not null,
  account_id  uuid not null references public.accounts (id),
  debit       numeric(14, 2) not null default 0,
  credit      numeric(14, 2) not null default 0,
  description text,
  constraint journal_lines_amounts_non_negative check (debit >= 0 and credit >= 0),
  constraint journal_lines_one_side_only check (debit = 0 or credit = 0),
  constraint journal_lines_not_empty check (debit + credit > 0),
  constraint journal_lines_entry_line_unique unique (entry_id, line_no)
);

comment on table public.journal_lines is
  'Lignes d''une écriture. Débit et crédit en colonnes séparées (numeric(14,2)), un seul côté non nul par ligne. Le code de taxe par ligne sera ajouté additivement en Phase 3.';

-- 5. Index de clés étrangères (bonne pratique : indexer les FK utilisées en jointure/filtre)
create index journal_lines_entry_id_idx on public.journal_lines (entry_id);
create index journal_lines_account_id_idx on public.journal_lines (account_id);
create index journal_entries_created_by_idx on public.journal_entries (created_by);
create index journal_entries_entry_date_idx on public.journal_entries (entry_date);
