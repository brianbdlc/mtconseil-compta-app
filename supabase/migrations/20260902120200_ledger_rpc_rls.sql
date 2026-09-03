-- Phase 2 : voie d'écriture (RPC SECURITY DEFINER) + RLS
--
-- Modèle d'accès (voir docs/PLAN.md « Voie d'écriture ») :
--   - RLS = SELECT seulement. lecteur ET editeur lisent toutes les données
--     financières ; AUCUNE policy d'écriture directe.
--   - Toute mutation passe par des fonctions SECURITY DEFINER qui : (1) exigent
--     le niveau `editeur`, (2) appliquent le verrou optimiste, (3) laissent les
--     triggers deferred garantir l'équilibre. « Pas de suppression de ligne
--     isolée » est vrai par construction : aucune voie de DELETE n'est exposée.
--   - On ne supprime jamais une écriture : on la contrepasse (écriture inverse).
--   - On ne supprime jamais un compte : on le désactive.

-- ============================================================================
-- 1. RLS : lecture pour tous les authentifiés, aucune écriture directe.
-- ============================================================================
alter table public.accounts        enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines   enable row level security;

-- Les nouvelles tables ne sont pas auto-exposées (config par défaut) : on accorde
-- explicitement le SELECT au rôle authenticated. La RLS filtre par-dessus.
grant select on public.accounts        to authenticated;
grant select on public.journal_entries to authenticated;
grant select on public.journal_lines   to authenticated;

create policy accounts_select_authenticated
  on public.accounts for select to authenticated using (true);

create policy journal_entries_select_authenticated
  on public.journal_entries for select to authenticated using (true);

create policy journal_lines_select_authenticated
  on public.journal_lines for select to authenticated using (true);

-- ============================================================================
-- 2. Helper : l'appelant est-il éditeur ?
-- ============================================================================
create or replace function public.is_editeur()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
      from public.profiles
     where id = (select auth.uid())
       and permission_level = 'editeur'
  );
$$;

comment on function public.is_editeur() is
  'Vrai si l''utilisateur courant a le niveau editeur. Utilisé par les RPC de mutation du grand livre.';

revoke execute on function public.is_editeur() from public, anon;
grant execute on function public.is_editeur() to authenticated;

-- ============================================================================
-- 3. Écritures : create / update (verrou optimiste) / reverse (contrepassation)
-- ============================================================================

-- Crée une écriture atomique. payload attendu :
--   { "entry_date": "2026-09-02", "description": "...",
--     "lines": [ { "account_id": "<uuid>", "debit": 100, "credit": 0,
--                  "description": "..." }, ... ] }
-- L'équilibre (Σ = 0, ≥ 2 lignes) est garanti par les triggers deferred au commit.
create or replace function public.create_journal_entry(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry_id   uuid;
  v_entry_date date;
  v_line_count integer;
begin
  if not public.is_editeur() then
    raise exception 'Droit éditeur requis pour créer une écriture.'
      using errcode = 'insufficient_privilege';
  end if;

  v_entry_date := (payload ->> 'entry_date')::date;
  if v_entry_date is null then
    raise exception 'entry_date requis.' using errcode = 'null_value_not_allowed';
  end if;

  v_line_count := jsonb_array_length(coalesce(payload -> 'lines', '[]'::jsonb));
  if v_line_count < 2 then
    raise exception 'Une écriture doit comporter au moins deux lignes.'
      using errcode = 'check_violation';
  end if;

  insert into public.journal_entries (entry_date, description, source, created_by)
  values (v_entry_date, payload ->> 'description', 'manuel', (select auth.uid()))
  returning id into v_entry_id;

  insert into public.journal_lines
    (entry_id, line_no, account_id, debit, credit, description)
  select v_entry_id,
         t.ord,
         (t.line ->> 'account_id')::uuid,
         coalesce((t.line ->> 'debit')::numeric, 0),
         coalesce((t.line ->> 'credit')::numeric, 0),
         t.line ->> 'description'
    from jsonb_array_elements(payload -> 'lines') with ordinality as t(line, ord);

  return v_entry_id;
end;
$$;

comment on function public.create_journal_entry(jsonb) is
  'Crée une écriture équilibrée (en-tête + lignes) en une transaction. Réservé aux éditeurs. L''équilibre est garanti par les triggers deferred.';

-- Remplace les lignes d'une écriture avec verrou optimiste. Rejette si la version
-- fournie est périmée, ou si l'écriture a été contrepassée (immuable).
create or replace function public.update_journal_entry(
  p_id               uuid,
  p_expected_version integer,
  payload            jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_version integer;
  v_reversed_at     timestamptz;
  v_entry_date      date;
  v_line_count      integer;
begin
  if not public.is_editeur() then
    raise exception 'Droit éditeur requis pour modifier une écriture.'
      using errcode = 'insufficient_privilege';
  end if;

  select version, reversed_at
    into v_current_version, v_reversed_at
    from public.journal_entries
   where id = p_id
   for update;

  if not found then
    raise exception 'Écriture % introuvable.', p_id using errcode = 'no_data_found';
  end if;

  if v_reversed_at is not null then
    raise exception 'Écriture % contrepassée : elle est immuable.', p_id
      using errcode = 'check_violation';
  end if;

  if v_current_version <> p_expected_version then
    raise exception
      'Conflit de version sur l''écriture % : attendue %, actuelle %.',
      p_id, p_expected_version, v_current_version
      using errcode = 'serialization_failure';
  end if;

  v_entry_date := (payload ->> 'entry_date')::date;
  if v_entry_date is null then
    raise exception 'entry_date requis.' using errcode = 'null_value_not_allowed';
  end if;

  v_line_count := jsonb_array_length(coalesce(payload -> 'lines', '[]'::jsonb));
  if v_line_count < 2 then
    raise exception 'Une écriture doit comporter au moins deux lignes.'
      using errcode = 'check_violation';
  end if;

  -- Remplacement atomique des lignes ; le trigger deferred revalide au commit.
  delete from public.journal_lines where entry_id = p_id;

  insert into public.journal_lines
    (entry_id, line_no, account_id, debit, credit, description)
  select p_id,
         t.ord,
         (t.line ->> 'account_id')::uuid,
         coalesce((t.line ->> 'debit')::numeric, 0),
         coalesce((t.line ->> 'credit')::numeric, 0),
         t.line ->> 'description'
    from jsonb_array_elements(payload -> 'lines') with ordinality as t(line, ord);

  update public.journal_entries
     set entry_date  = v_entry_date,
         description = payload ->> 'description',
         version     = version + 1,
         updated_at  = now()
   where id = p_id;

  return v_current_version + 1;
end;
$$;

comment on function public.update_journal_entry(uuid, integer, jsonb) is
  'Remplace les lignes d''une écriture avec verrou optimiste (rejette une version périmée) et incrémente la version. Réservé aux éditeurs. Refuse une écriture contrepassée.';

-- Contrepasse une écriture : crée une écriture inverse (débit↔crédit) dans la
-- période courante, liée à l'originale, et marque l'originale comme contrepassée.
create or replace function public.reverse_journal_entry(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reversed_at timestamptz;
  v_new_id      uuid;
begin
  if not public.is_editeur() then
    raise exception 'Droit éditeur requis pour contrepasser une écriture.'
      using errcode = 'insufficient_privilege';
  end if;

  select reversed_at into v_reversed_at
    from public.journal_entries
   where id = p_id
   for update;

  if not found then
    raise exception 'Écriture % introuvable.', p_id using errcode = 'no_data_found';
  end if;

  if v_reversed_at is not null then
    raise exception 'Écriture % déjà contrepassée.', p_id
      using errcode = 'check_violation';
  end if;

  insert into public.journal_entries
    (entry_date, description, source, created_by, reverses_entry_id)
  values (
    current_date,
    'Contrepassation de l''écriture ' || p_id::text,
    'manuel',
    (select auth.uid()),
    p_id
  )
  returning id into v_new_id;

  -- Lignes inversées : débit devient crédit et vice-versa.
  insert into public.journal_lines
    (entry_id, line_no, account_id, debit, credit, description)
  select v_new_id, line_no, account_id, credit, debit, description
    from public.journal_lines
   where entry_id = p_id;

  update public.journal_entries
     set reversed_at = now(),
         version     = version + 1,
         updated_at  = now()
   where id = p_id;

  return v_new_id;
end;
$$;

comment on function public.reverse_journal_entry(uuid) is
  'Crée l''écriture de contrepassation (lignes inversées) dans la période courante et marque l''originale contrepassée. Réservé aux éditeurs. Refuse une double contrepassation.';

-- ============================================================================
-- 4. Plan comptable : create / update / activer-désactiver (jamais de delete)
-- ============================================================================
create or replace function public.create_account(
  p_number      text,
  p_name        text,
  p_class       public.account_class,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_editeur() then
    raise exception 'Droit éditeur requis pour créer un compte.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.accounts (number, name, class, description)
  values (btrim(p_number), btrim(p_name), p_class, p_description)
  returning id into v_id;

  return v_id;
end;
$$;

-- Modifie un compte. La classe ne peut changer que si aucune ligne ne l'utilise
-- (changer la classe d'un compte déjà mouvementé fausserait les états).
create or replace function public.update_account(
  p_id          uuid,
  p_number      text,
  p_name        text,
  p_class       public.account_class,
  p_description text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_class public.account_class;
begin
  if not public.is_editeur() then
    raise exception 'Droit éditeur requis pour modifier un compte.'
      using errcode = 'insufficient_privilege';
  end if;

  select class into v_current_class from public.accounts where id = p_id;
  if not found then
    raise exception 'Compte % introuvable.', p_id using errcode = 'no_data_found';
  end if;

  if p_class <> v_current_class
     and exists (select 1 from public.journal_lines where account_id = p_id) then
    raise exception
      'Impossible de changer la classe d''un compte déjà mouvementé.'
      using errcode = 'check_violation';
  end if;

  update public.accounts
     set number      = btrim(p_number),
         name        = btrim(p_name),
         class       = p_class,
         description = p_description,
         updated_at  = now()
   where id = p_id;
end;
$$;

create or replace function public.set_account_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_editeur() then
    raise exception 'Droit éditeur requis pour (dés)activer un compte.'
      using errcode = 'insufficient_privilege';
  end if;

  update public.accounts
     set is_active = p_active, updated_at = now()
   where id = p_id;

  if not found then
    raise exception 'Compte % introuvable.', p_id using errcode = 'no_data_found';
  end if;
end;
$$;

-- ============================================================================
-- 5. Exposition : seuls les authentifiés peuvent appeler les RPC de mutation.
--    Le contrôle fin (editeur) est fait dans le corps de chaque fonction.
-- ============================================================================
revoke execute on function public.create_journal_entry(jsonb) from public, anon;
revoke execute on function public.update_journal_entry(uuid, integer, jsonb) from public, anon;
revoke execute on function public.reverse_journal_entry(uuid) from public, anon;
revoke execute on function public.create_account(text, text, public.account_class, text) from public, anon;
revoke execute on function public.update_account(uuid, text, text, public.account_class, text) from public, anon;
revoke execute on function public.set_account_active(uuid, boolean) from public, anon;

grant execute on function public.create_journal_entry(jsonb) to authenticated;
grant execute on function public.update_journal_entry(uuid, integer, jsonb) to authenticated;
grant execute on function public.reverse_journal_entry(uuid) to authenticated;
grant execute on function public.create_account(text, text, public.account_class, text) to authenticated;
grant execute on function public.update_account(uuid, text, text, public.account_class, text) to authenticated;
grant execute on function public.set_account_active(uuid, boolean) to authenticated;
