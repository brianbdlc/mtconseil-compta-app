-- Phase 2 : seed du plan comptable générique
--
-- Donnée de référence livrée en MIGRATION (et non dans seed.sql) : seul le contenu
-- des migrations est appliqué au projet lié par `supabase db push`. Insert idempotent
-- (on conflict do nothing sur le numéro) → rejouable sans doublon.
--
-- Plan générique québécois, ajustable ensuite via l'écran de gestion des comptes.
-- Numérotation par blocs : 1xxx actif · 2xxx passif · 3xxx capitaux propres ·
-- 4xxx revenus · 5xxx dépenses. Les comptes de taxe distinguent CTI (actif,
-- payée sur achats) et taxes perçues (passif, sur ventes) — voir CLAUDE.md.

insert into public.accounts (number, name, class, description) values
  -- Actif (1xxx)
  ('1000', 'Encaisse — compte bancaire',        'actif',            'Solde du compte bancaire courant.'),
  ('1100', 'Clients à recevoir',                'actif',            'Créances clients (comptes clients / AR).'),
  ('1300', 'CTI — TPS à recouvrer',             'actif',            'Crédit de taxe sur intrants : TPS payée sur les achats.'),
  ('1310', 'CTI — TVQ à recouvrer',             'actif',            'Crédit de taxe sur intrants : TVQ payée sur les achats.'),
  ('1500', 'Immobilisations',                   'actif',            'Équipements et actifs immobilisés.'),
  -- Passif (2xxx)
  ('2000', 'Fournisseurs à payer',              'passif',           'Dettes fournisseurs (comptes fournisseurs / AP).'),
  ('2100', 'TPS perçue à remettre',             'passif',           'TPS perçue sur les ventes, à remettre.'),
  ('2110', 'TVQ perçue à remettre',             'passif',           'TVQ perçue sur les ventes, à remettre.'),
  ('2200', 'Cartes de crédit à payer',          'passif',           'Soldes de cartes de crédit.'),
  -- Capitaux propres (3xxx)
  ('3000', 'Capital',                           'capitaux_propres', 'Apports des propriétaires.'),
  ('3100', 'Bénéfices non répartis',            'capitaux_propres', 'Résultats cumulés non distribués.'),
  ('3200', 'Retraits / dividendes',             'capitaux_propres', 'Retraits des propriétaires.'),
  -- Revenus (4xxx)
  ('4000', 'Revenus de services',               'revenus',          'Honoraires et services rendus.'),
  ('4900', 'Autres revenus',                    'revenus',          'Revenus divers (intérêts, etc.).'),
  -- Dépenses (5xxx)
  ('5000', 'Sous-traitance et honoraires',      'depenses',         'Honoraires professionnels et sous-traitants.'),
  ('5100', 'Loyer',                             'depenses',         'Loyer des locaux.'),
  ('5200', 'Télécommunications',                'depenses',         'Téléphonie et Internet.'),
  ('5300', 'Fournitures de bureau',             'depenses',         'Petites fournitures et consommables.'),
  ('5400', 'Logiciels et abonnements',          'depenses',         'Abonnements SaaS et licences.'),
  ('5500', 'Frais bancaires',                   'depenses',         'Frais de service bancaires.'),
  ('5600', 'Déplacements et représentation',    'depenses',         'Frais de déplacement et de représentation.')
on conflict (number) do nothing;
