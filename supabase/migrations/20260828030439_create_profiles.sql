-- Phase 1 : profils utilisateurs + niveaux de permission
--
-- Modèle d'accès (voir docs/PLAN.md « Auth & permissions ») :
--   - Invitation par courriel via le dashboard Supabase ; le niveau est passé en
--     metadata (raw_user_meta_data->>'permission_level') et lu par le trigger.
--   - Deux niveaux : `lecteur` (lecture seule) et `editeur` (lecture + écriture).
--   - Défaut `lecteur` (moindre privilège) si la metadata est absente/invalide.
--   - « Admin » = humain via le dashboard (service_role), pas un rôle applicatif.
--   - La distinction lecture/écriture sera portée par RLS sur les tables
--     financières (Phase 2+). Ici, `profiles` n'expose que la lecture de sa
--     propre ligne.

-- 1. Niveau de permission
create type public.permission_level as enum ('lecteur', 'editeur');

-- 2. Table des profils (une ligne par utilisateur auth)
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  permission_level public.permission_level not null default 'lecteur',
  full_name        text,
  created_at       timestamptz not null default now()
);

comment on table public.profiles is
  'Profil applicatif d''un utilisateur auth : niveau de permission + identité. Point d''ancrage stable pour l''auteur des écritures et la piste d''audit.';
comment on column public.profiles.permission_level is
  'lecteur = lecture seule ; editeur = lecture + création/modification. Choisi à l''invitation, ajustable par un admin via le dashboard.';

-- 3. RLS : un utilisateur ne voit que sa propre ligne.
--    Aucune policy d''écriture en Phase 1 : le niveau et l''identité sont gérés
--    par le trigger / le dashboard (service_role contourne la RLS). Autoriser
--    l''auto-UPDATE ouvrirait une escalade de privilège (lecteur -> editeur).
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- 4. Création automatique du profil à l''inscription (invitation dashboard).
--    SECURITY DEFINER pour insérer malgré la RLS ; search_path vidé et
--    identifiants pleinement qualifiés (bonne pratique sécurité). Le niveau
--    invalide/absent retombe sur `lecteur`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lvl public.permission_level;
begin
  begin
    lvl := (new.raw_user_meta_data ->> 'permission_level')::public.permission_level;
  exception when others then
    lvl := 'lecteur';
  end;

  if lvl is null then
    lvl := 'lecteur';
  end if;

  insert into public.profiles (id, permission_level, full_name)
  values (new.id, lvl, new.raw_user_meta_data ->> 'full_name');

  return new;
end;
$$;

-- Le trigger s''exécute en tant que définisseur ; personne ne doit appeler la
-- fonction directement.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
