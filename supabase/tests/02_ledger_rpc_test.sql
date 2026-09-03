-- Tests pgTAP — RPC du grand livre : permissions, verrou optimiste, contrepassation.
--
-- Exécution : `supabase test db`.
--
-- Auth simulée : on insère un éditeur et un lecteur dans auth.users (le trigger
-- handle_new_user crée le profil au bon niveau), puis on positionne
-- `request.jwt.claims` (sub = id) ; les RPC lisent l'appelant via auth.uid().
--
-- Mêmes règles que 01 : DML « à annuler » dans la charge des assertions ; mode
-- différé remis avant chaque scénario. Les fixtures multi-assertions (verrou,
-- contrepassation) sont créées hors assertion et nettoyées par le ROLLBACK final.

begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into public.accounts (id, number, name, class) values
  ('11111111-1111-1111-1111-111111111111', 'T1000', 'Test — banque',  'actif'),
  ('22222222-2222-2222-2222-222222222222', 'T5000', 'Test — dépense', 'depenses');

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at,
   raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000',
   'ed17e000-0000-0000-0000-0000000000ed', 'authenticated', 'authenticated',
   'editeur@test.local', '', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"permission_level":"editeur"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000',
   '1ec70000-0000-0000-0000-00000000010c', 'authenticated', 'authenticated',
   'lecteur@test.local', '', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"permission_level":"lecteur"}'::jsonb);

-- 1) Un lecteur ne peut PAS créer d'écriture (droit refusé, immédiat).
set constraints all deferred;
select set_config('request.jwt.claims',
  json_build_object('sub', '1ec70000-0000-0000-0000-00000000010c')::text, true);
select throws_ok(
  $$ select public.create_journal_entry(
       '{"entry_date":"2026-09-02","lines":[
         {"account_id":"22222222-2222-2222-2222-222222222222","debit":100},
         {"account_id":"11111111-1111-1111-1111-111111111111","credit":100}]}'::jsonb) $$,
  '42501',
  null,
  'Un lecteur ne peut pas créer d''écriture (insufficient_privilege)'
);

-- Bascule en éditeur pour la suite.
select set_config('request.jwt.claims',
  json_build_object('sub', 'ed17e000-0000-0000-0000-0000000000ed')::text, true);

-- 2) Un éditeur crée une écriture équilibrée (validée au commit forcé).
set constraints all deferred;
select lives_ok(
  $$
    select public.create_journal_entry(
      '{"entry_date":"2026-09-02","description":"vente","lines":[
        {"account_id":"22222222-2222-2222-2222-222222222222","debit":100},
        {"account_id":"11111111-1111-1111-1111-111111111111","credit":100}]}'::jsonb);
    set constraints all immediate;
  $$,
  'Éditeur : écriture équilibrée créée et validée'
);

-- 3) Un éditeur ne peut pas créer une écriture déséquilibrée (rejet au commit forcé).
set constraints all deferred;
select throws_ok(
  $$
    select public.create_journal_entry(
      '{"entry_date":"2026-09-02","lines":[
        {"account_id":"22222222-2222-2222-2222-222222222222","debit":100},
        {"account_id":"11111111-1111-1111-1111-111111111111","credit":90}]}'::jsonb);
    set constraints all immediate;
  $$,
  '23514',
  null,
  'Éditeur : écriture déséquilibrée rejetée par la BD'
);

-- 4-5) Verrou optimiste : version périmée rejetée, version courante acceptée.
set constraints all deferred;
create temporary table _e as
  select public.create_journal_entry(
    '{"entry_date":"2026-09-02","lines":[
      {"account_id":"22222222-2222-2222-2222-222222222222","debit":100},
      {"account_id":"11111111-1111-1111-1111-111111111111","credit":100}]}'::jsonb) as id;
select throws_ok(
  format($$ select public.update_journal_entry(%L, 99,
    '{"entry_date":"2026-09-02","lines":[
      {"account_id":"22222222-2222-2222-2222-222222222222","debit":120},
      {"account_id":"11111111-1111-1111-1111-111111111111","credit":120}]}'::jsonb) $$,
    (select id from _e)),
  '40001',
  null,
  'Modification sur version périmée rejetée (verrou optimiste)'
);
select lives_ok(
  format($$
    select public.update_journal_entry(%L, 1,
      '{"entry_date":"2026-09-02","lines":[
        {"account_id":"22222222-2222-2222-2222-222222222222","debit":120},
        {"account_id":"11111111-1111-1111-1111-111111111111","credit":120}]}'::jsonb);
    set constraints all immediate;
  $$, (select id from _e)),
  'Modification sur version courante acceptée'
);

-- 6-7-8) Contrepassation : crée l'inverse, marque l'originale, refuse un doublon.
set constraints all deferred;
create temporary table _er as
  select public.create_journal_entry(
    '{"entry_date":"2026-09-02","lines":[
      {"account_id":"22222222-2222-2222-2222-222222222222","debit":100},
      {"account_id":"11111111-1111-1111-1111-111111111111","credit":100}]}'::jsonb) as id;
select public.reverse_journal_entry((select id from _er));
select is(
  (select count(*)::int from public.journal_entries
     where reverses_entry_id = (select id from _er)),
  1,
  'Contrepassation : une écriture d''inversion liée est créée'
);
select ok(
  (select reversed_at is not null from public.journal_entries where id = (select id from _er)),
  'Contrepassation : l''écriture originale est marquée contrepassée'
);
select throws_ok(
  format($$ select public.reverse_journal_entry(%L) $$, (select id from _er)),
  '23514',
  null,
  'Double contrepassation refusée'
);

-- 9) Compte : impossible de changer la classe d'un compte déjà mouvementé.
set constraints all deferred;
create temporary table _acc as
  select public.create_account('T9000', 'Test — compte mouvementé', 'depenses') as id;
select public.create_journal_entry(
  format('{"entry_date":"2026-09-02","lines":[
    {"account_id":"%s","debit":50},
    {"account_id":"11111111-1111-1111-1111-111111111111","credit":50}]}',
    (select id from _acc))::jsonb);
select throws_ok(
  format($$ select public.update_account(%L, 'T9000', 'Renommé', 'revenus') $$,
    (select id from _acc)),
  '23514',
  null,
  'Changement de classe d''un compte déjà mouvementé refusé'
);

select * from finish();
rollback;
