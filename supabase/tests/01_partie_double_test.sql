-- Tests pgTAP — invariant partie double garanti au niveau BD (US-21).
--
-- Exécution : `supabase test db` (nécessite Docker + `supabase start`).
--
-- Les triggers d'équilibre sont DEFERRABLE INITIALLY DEFERRED (vérifiés au COMMIT).
-- Comme un test pgTAP se termine par ROLLBACK, on force la vérification avec
-- `SET CONSTRAINTS ALL IMMEDIATE` À L'INTÉRIEUR de la charge de l'assertion.
--
-- Deux règles pour ne pas corrompre l'état interne de pgTAP :
--   1. Toute la DML d'un scénario vit DANS la charge de throws_ok/lives_ok — leur
--      savepoint interne l'isole et l'annule (on n'utilise donc pas de savepoint
--      externe : `ROLLBACK TO SAVEPOINT` annulerait aussi le compteur de tests).
--   2. `SET CONSTRAINTS` n'étant pas annulé par les savepoints, on remet le mode
--      différé (`set constraints all deferred`) avant chaque scénario.

begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into public.accounts (id, number, name, class) values
  ('11111111-1111-1111-1111-111111111111', 'T1000', 'Test — banque',  'actif'),
  ('22222222-2222-2222-2222-222222222222', 'T5000', 'Test — dépense', 'depenses');

-- 1) Écriture équilibrée (2 lignes) acceptée.
set constraints all deferred;
select lives_ok(
  $$
    insert into public.journal_entries (id, entry_date)
      values ('aaaa1111-0000-0000-0000-000000000001', current_date);
    insert into public.journal_lines (entry_id, line_no, account_id, debit, credit) values
      ('aaaa1111-0000-0000-0000-000000000001', 1, '22222222-2222-2222-2222-222222222222', 100.00, 0),
      ('aaaa1111-0000-0000-0000-000000000001', 2, '11111111-1111-1111-1111-111111111111', 0, 100.00);
    set constraints all immediate;
  $$,
  'Écriture équilibrée (Σ débits = Σ crédits, 2 lignes) acceptée'
);

-- 2) Écriture déséquilibrée rejetée.
set constraints all deferred;
select throws_ok(
  $$
    insert into public.journal_entries (id, entry_date)
      values ('aaaa1111-0000-0000-0000-000000000002', current_date);
    insert into public.journal_lines (entry_id, line_no, account_id, debit, credit) values
      ('aaaa1111-0000-0000-0000-000000000002', 1, '22222222-2222-2222-2222-222222222222', 100.00, 0),
      ('aaaa1111-0000-0000-0000-000000000002', 2, '11111111-1111-1111-1111-111111111111', 0, 90.00);
    set constraints all immediate;
  $$,
  '23514',
  null,
  'Écriture déséquilibrée (100 ≠ 90) rejetée par la BD'
);

-- 3) Écriture à une seule ligne rejetée (< 2 lignes).
set constraints all deferred;
select throws_ok(
  $$
    insert into public.journal_entries (id, entry_date)
      values ('aaaa1111-0000-0000-0000-000000000003', current_date);
    insert into public.journal_lines (entry_id, line_no, account_id, debit, credit) values
      ('aaaa1111-0000-0000-0000-000000000003', 1, '22222222-2222-2222-2222-222222222222', 100.00, 0);
    set constraints all immediate;
  $$,
  '23514',
  null,
  'Écriture à une seule ligne rejetée'
);

-- 4) Supprimer une ligne isolée d'une écriture équilibrée est rejeté.
set constraints all deferred;
select throws_ok(
  $$
    insert into public.journal_entries (id, entry_date)
      values ('aaaa1111-0000-0000-0000-000000000004', current_date);
    insert into public.journal_lines (entry_id, line_no, account_id, debit, credit) values
      ('aaaa1111-0000-0000-0000-000000000004', 1, '22222222-2222-2222-2222-222222222222', 100.00, 0),
      ('aaaa1111-0000-0000-0000-000000000004', 2, '11111111-1111-1111-1111-111111111111', 0, 100.00);
    delete from public.journal_lines
      where entry_id = 'aaaa1111-0000-0000-0000-000000000004' and line_no = 2;
    set constraints all immediate;
  $$,
  '23514',
  null,
  'Suppression d''une ligne isolée (déséquilibre / < 2 lignes) rejetée'
);

-- 5) Modifier une ligne en créant un déséquilibre est rejeté.
set constraints all deferred;
select throws_ok(
  $$
    insert into public.journal_entries (id, entry_date)
      values ('aaaa1111-0000-0000-0000-000000000005', current_date);
    insert into public.journal_lines (entry_id, line_no, account_id, debit, credit) values
      ('aaaa1111-0000-0000-0000-000000000005', 1, '22222222-2222-2222-2222-222222222222', 100.00, 0),
      ('aaaa1111-0000-0000-0000-000000000005', 2, '11111111-1111-1111-1111-111111111111', 0, 100.00);
    update public.journal_lines set debit = 999.00
      where entry_id = 'aaaa1111-0000-0000-0000-000000000005' and line_no = 1;
    set constraints all immediate;
  $$,
  '23514',
  null,
  'Modification d''une ligne créant un déséquilibre rejetée'
);

-- 6) Écriture sans aucune ligne rejetée (trigger d'en-tête).
set constraints all deferred;
select throws_ok(
  $$
    insert into public.journal_entries (id, entry_date)
      values ('aaaa1111-0000-0000-0000-000000000006', current_date);
    set constraints all immediate;
  $$,
  '23514',
  null,
  'Écriture sans aucune ligne rejetée'
);

select * from finish();
rollback;
