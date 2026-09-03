-- Phase 2 : invariant partie double garanti au niveau BD
--
-- Deux CONSTRAINT TRIGGERs DEFERRABLE INITIALLY DEFERRED partagent une même
-- fonction de vérification, appelée AU COMMIT :
--   - sur journal_lines (INSERT/UPDATE/DELETE) : couvre l'ajout, la modification
--     et la suppression de lignes ;
--   - sur journal_entries (INSERT) : ferme l'angle mort d'une écriture créée
--     SANS aucune ligne (aucun événement de ligne ne se produirait, donc le
--     premier trigger ne se déclencherait jamais).
--
-- « Deferred » = vérification en fin de transaction : on peut construire ou
-- remplacer les lignes d'une écriture en plusieurs instructions sans jamais
-- passer par un état intermédiaire rejeté. La garantie tient QUEL QUE SOIT le
-- chemin (RPC, service_role, SQL direct) — c'est le cœur de l'US-21.
--
-- Chaque écriture doit : compter ≥ 2 lignes ET Σ débits = Σ crédits. Le seuil
-- « ≥ 2 lignes » empêche de supprimer les lignes jusqu'à une écriture vide/unique
-- qui « équilibrerait » trivialement à 0.

-- 1. Vérification partagée pour une écriture donnée.
create or replace function public.check_journal_entry_integrity(eid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_debit  numeric(14, 2);
  total_credit numeric(14, 2);
  line_count   integer;
begin
  -- L'écriture entière a pu disparaître dans la même transaction (en-tête +
  -- lignes supprimés) : plus rien à vérifier.
  if not exists (select 1 from public.journal_entries where id = eid) then
    return;
  end if;

  select coalesce(sum(debit), 0),
         coalesce(sum(credit), 0),
         count(*)
    into total_debit, total_credit, line_count
    from public.journal_lines
   where entry_id = eid;

  if line_count < 2 then
    raise exception
      'Écriture % : au moins deux lignes requises (trouvé %).', eid, line_count
      using errcode = 'check_violation';
  end if;

  if total_debit <> total_credit then
    raise exception
      'Écriture % déséquilibrée : Σ débits = % ≠ Σ crédits = %.',
      eid, total_debit, total_credit
      using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.check_journal_entry_integrity(uuid) is
  'Vérifie qu''une écriture est équilibrée (Σ débits = Σ crédits) et compte ≥ 2 lignes. Appelée par les triggers deferred de partie double.';

-- 2. Trigger de lignes : dérive l'écriture concernée puis vérifie.
create or replace function public.tg_journal_lines_balanced()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.check_journal_entry_integrity(old.entry_id);
  else
    perform public.check_journal_entry_integrity(new.entry_id);
  end if;
  return null;
end;
$$;

-- 3. Trigger d'en-tête : vérifie l'écriture nouvellement insérée.
create or replace function public.tg_journal_entries_balanced()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_journal_entry_integrity(new.id);
  return null;
end;
$$;

-- Fonctions internes : appelées uniquement par les triggers.
revoke execute on function public.check_journal_entry_integrity(uuid)
  from public, anon, authenticated;
revoke execute on function public.tg_journal_lines_balanced()
  from public, anon, authenticated;
revoke execute on function public.tg_journal_entries_balanced()
  from public, anon, authenticated;

create constraint trigger enforce_lines_balanced
  after insert or update or delete on public.journal_lines
  deferrable initially deferred
  for each row
  execute function public.tg_journal_lines_balanced();

create constraint trigger enforce_entry_has_lines
  after insert on public.journal_entries
  deferrable initially deferred
  for each row
  execute function public.tg_journal_entries_balanced();
