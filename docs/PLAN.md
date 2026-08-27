# Plan : App de comptabilité MT Conseil

> PRD source : docs/PRD.md

## Contexte

MT Conseil remplace graduellement Zoho Books par une app de comptabilité sur mesure,
bâtie autour d'un grand livre en partie double où chaque événement financier devient
une écriture équilibrée. Ce plan découpe le PRD (25 user stories) en **tranches
verticales (tracer bullets)** : chaque phase traverse toutes les couches
(schema → règles comptables → API → UI → tests) et est démontrable seule.

**Contrainte d'ingestion (n8n + Google Sheets)** : la communication des factures passe
par un Google Sheet. n8n écrit dans le Sheet ; **c'est l'app qui tire les données** via
l'API Google Sheets, soit sur une base **programmée** (toutes les X min), soit
**déclenchée manuellement** par l'opérateur (bouton « synchroniser maintenant »).
L'app _pull_, elle ne reçoit pas de webhook. La zone tampon Sheet et l'anti-doublon
restent côté n8n.

**Décisions produit confirmées** : pas de workflow d'approbation/rejet ; les deux rôles
peuvent modifier n'importe quelle écriture (aucune restriction d'édition entre rôles) —
la piste d'audit assure la traçabilité. Catégorisation simple pour le MVP (règles
éditables sans redéploiement). Projet greenfield.

## Décisions architecturales

Décisions durables qui s'appliquent à toutes les phases :

- **Stack** : Next.js (App Router) + Supabase — Postgres, Auth, Storage, Edge Functions, pg_cron.
- **Auth & rôles** : Supabase Auth email/mot de passe + reset. Deux rôles nominaux
  (`operateur`, `contact_mt`) avec **capacité d'édition identique**, sans workflow
  d'approbation. Toute distinction éventuelle se limite à des **actions spécifiques**
  (ex. clôture d'année), à trancher plus tard ; portée par RLS si/quand nécessaire.
- **Cœur grand livre** :
  - `accounts` — plan comptable (5 classes : actif, passif, capitaux propres, revenus, dépenses)
  - `journal_entries` — en-tête d'écriture (date, période, description, source, auteur, version)
  - `journal_lines` — lignes (compte, débit, crédit, code de taxe)
- **Invariant partie double** : garanti au niveau BD par un trigger de contrainte
  (idéalement *deferred*, vérifié au commit) sur **INSERT / UPDATE / DELETE** des lignes
  (Σ débits = Σ crédits). Impossible de déséquilibrer une écriture — ni en corrigeant,
  ni en supprimant une ligne isolée. Règle produit : on n'efface pas une ligne seule,
  on annule/contrepasse l'écriture complète.
- **Verrouillage optimiste** : chaque `journal_entries` porte une version/horodatage ;
  une modification concurrente sur une version périmée est rejetée.
- **Passé immuable** : période clôturée → écritures en lecture seule (trigger/RLS) ;
  correction uniquement par écriture d'ajustement dans la période courante.
- **Ingestion** : pull Google Sheets API (compte de service) vers une table de staging
  idempotente ; déclenchement **programmé via pg_cron → Edge Function** + **manuel** ;
  mapping colonnes Sheet → champs BD **configurable** (config type JSON, sans redéploiement).
- **Catégorisation** : mapping modulaire piloté par des règles en base (`category_rules`),
  éditables sans redéploiement ; suggestion corrigeable. Pas d'UI élaborée au MVP.
- **Tables domaine** : `vendor_invoices` (AP), `customer_invoices` (AR),
  `payments` (paiements partiels multiples, solde restant calculé),
  `credit_notes` (notes de crédit — type d'écriture distinct réduisant un solde dû
  sans modifier la facture d'origine), `tax_codes` (TPS 5 %, TVQ 9,975 %),
  `fiscal_years` / `periods`, `audit_log`, `sync_runs`, `bank_statements`.
- **Tests automatisés (transversal)** : toute phase touchant aux écritures livre des
  tests vérifiant Σ débits = Σ crédits à l'insertion, la modification et la suppression
  de ligne — pas seulement une vérification visuelle.
- **Routes** : `/login`, `/dashboard`, `/fournisseurs`, `/clients`, `/grand-livre`,
  `/taxes`, `/etats`, `/cloture`, `/export`, `/parametres`.

---

## Phase 1 : Walking skeleton — auth + shell

**User stories** : US-1, US-2

### Ce qu'on livre

Login par courriel + mot de passe avec réinitialisation, shell d'app protégé avec
navigation, dashboard vide. Deux rôles nominaux (`operateur`, `contact_mt`) avec la
même capacité d'édition — aucune restriction entre rôles ; une distinction future se
limite à des actions spécifiques (ex. clôture). Pose les fondations Next.js + Supabase Auth.

### Critères d'acceptation

- [ ] Un utilisateur peut se connecter par courriel + mot de passe et réinitialiser un mot de passe oublié.
- [ ] Les routes de l'app sont protégées ; un non-authentifié est redirigé vers `/login`.
- [ ] Les deux rôles existent et accèdent à l'app ; aucune restriction d'édition entre eux.
- [ ] Le shell affiche la navigation et un dashboard vide.

## Bloquée par

Aucune — démarrable immédiatement.

---

## Phase 2 : Grand livre partie double + plan comptable

**User stories** : US-21

### Ce qu'on livre

Le cœur comptable : plan comptable générique seedé (5 classes), saisie d'une écriture
manuelle équilibrée, consultation du grand livre. La partie double est garantie au
niveau BD à l'insertion, la modification **et** la suppression de ligne. Un écran simple
permet d'ajouter/modifier des comptes après le seed. Chaque écriture porte un verrou
optimiste contre les modifications concurrentes.

### Critères d'acceptation

- [ ] Le plan comptable est seedé avec les 5 classes et consultable.
- [ ] On peut créer une écriture manuelle ; une écriture déséquilibrée est rejetée par la BD.
- [ ] Supprimer une ligne isolée est impossible ; seule l'annulation de l'écriture complète l'est.
- [ ] Une modification concurrente sur une version périmée est rejetée (verrou optimiste).
- [ ] On peut ajouter/modifier un compte après le seed initial.
- [ ] Tests automatisés : Σ débits = Σ crédits vérifié à l'insertion, la modification, la suppression de ligne.

## Bloquée par

- Phase 1

---

## Phase 3 : Facture fournisseur manuelle → écriture de dépense

**User stories** : US-3, US-5, US-7, US-16

### Ce qu'on livre

Saisie manuelle d'une facture fournisseur avec un code de taxe par ligne, et génération
automatique de l'écriture équilibrée (dépense Dt, TPS/TVQ CTI Dt, fournisseurs à payer Ct).
Chaque dépense est catégorisée par poste avec une suggestion corrigeable, pilotée par
des règles en base éditables sans redéploiement (simple pour le MVP).

### Critères d'acceptation

- [ ] On saisit une facture fournisseur avec code de taxe par ligne.
- [ ] L'app génère l'écriture équilibrée (dépense Dt, CTI TPS/TVQ Dt, fournisseurs à payer Ct).
- [ ] Une suggestion de poste comptable est proposée et corrigeable.
- [ ] Les règles de catégorisation sont modifiables en base sans redéploiement.

## Bloquée par

- Phase 2

---

## Phase 4 : Cycle de paiement AP — paiements + décaissement

**User stories** : US-6

### Ce qu'on livre

Enregistrement des paiements fournisseurs avec génération de l'écriture de décaissement
(fournisseurs à payer Dt, banque Ct). Prise en charge des **paiements partiels multiples**
avec solde restant calculé automatiquement, et des **notes de crédit** fournisseur
(type d'écriture distinct réduisant le solde dû sans modifier la facture d'origine).
Complète la boucle AP sans recours à Zoho.

### Critères d'acceptation

- [ ] Enregistrer un paiement génère l'écriture de décaissement équilibrée.
- [ ] Plusieurs paiements partiels sur une même facture sont possibles ; le solde restant est recalculé.
- [ ] Une note de crédit fournisseur réduit le solde dû sans modifier la facture d'origine.
- [ ] Une facture parcourt réception → écriture → paiement(s) → soldée, entièrement dans l'app.

## Bloquée par

- Phase 3

---

## Phase 5 : Ingestion n8n via Google Sheets + pièce source

**User stories** : US-4, US-9

### Ce qu'on livre

L'app tire les factures fournisseurs du Google Sheet (API, compte de service) vers une
table de staging idempotente, puis crée les factures en réutilisant la logique de la
Phase 3. Deux déclencheurs : **programmé** (pg_cron → Edge Function, toutes les X min)
et **manuel** (bouton « synchroniser maintenant »). Le mapping colonnes → champs est
configurable (config type JSON). La pièce source (image/PDF fournie par n8n) est
consultable depuis chaque entrée.

### Critères d'acceptation

- [ ] La sync programmée tire les nouvelles lignes du Sheet à intervalle régulier.
- [ ] Le bouton « synchroniser maintenant » déclenche une sync immédiate.
- [ ] L'ingestion est idempotente (pas de doublon d'écriture sur re-sync).
- [ ] Le mapping colonnes du Sheet est configurable sans redéploiement.
- [ ] La pièce source est consultable depuis l'entrée.
- [ ] Une facture importée illisible/incomplète est signalée clairement et mise en attente (pas créée).
- [ ] Chaque exécution de sync est tracée (`sync_runs`).

## Bloquée par

- Phase 3

---

## Phase 6 : Dépenses récurrentes

**User stories** : US-8

### Ce qu'on livre

Reconnaissance des dépenses récurrentes (même fournisseur + montant similaire +
fréquence régulière) pour éviter un traitement complet à chaque occurrence.

### Critères d'acceptation

- [ ] L'app détecte une dépense récurrente et la signale à l'opérateur.
- [ ] Le traitement d'une récurrence reconnue est allégé par rapport à une saisie complète.

## Bloquée par

- Phase 3 (bénéficie de la Phase 5)

---

## Phase 7 : Rituels hebdomadaires — tenue de livres + révision

**User stories** : US-10, US-11

### Ce qu'on livre

Deux parcours distincts : la **tenue de livres** (saisie et génération d'écritures) et
la **révision** (contrôle qualité, corrections dans l'app — jamais dans le Sheet). Le
parcours de révision signale clairement quand aucune nouvelle facture n'a été traitée
depuis la dernière révision.

### Critères d'acceptation

- [ ] Le parcours de tenue de livres permet de saisir et générer les écritures de la semaine.
- [ ] Le parcours de révision permet de contrôler et corriger les entrées dans l'app.
- [ ] La révision indique clairement quand il n'y a rien de nouveau à réviser.

## Bloquée par

- Phase 3 (idéalement Phase 5)

---

## Phase 8 : Comptes clients (AR) — import, revenu, encaissement

**User stories** : US-12, US-13, US-14

### Ce qu'on livre

Import manuel des factures clients (émises via Zoho), génération de l'écriture AR
(clients à recevoir Dt, revenus + taxes perçues Ct) et enregistrement des encaissements
(banque Dt, clients à recevoir Ct). Prise en charge des **encaissements partiels
multiples** avec solde restant calculé, et des **notes de crédit** client.

### Critères d'acceptation

- [ ] On importe manuellement une facture client et l'écriture AR est générée.
- [ ] Un encaissement génère l'écriture équilibrée ; plusieurs encaissements partiels sont possibles.
- [ ] Le solde restant à recevoir est recalculé automatiquement.
- [ ] Une note de crédit client réduit le solde à recevoir sans modifier la facture d'origine.

## Bloquée par

- Phase 2

---

## Phase 9 : Balance âgée par client

**User stories** : US-15

### Ce qu'on livre

Rapport de balance âgée groupé par client, réparti en tranches 0-30 / 30-60 / 60-90+ jours,
basé sur les soldes restants.

### Critères d'acceptation

- [ ] Le rapport affiche, par client, les créances réparties en 0-30 / 30-60 / 60-90+ jours.
- [ ] Les montants reflètent les soldes restants (paiements partiels pris en compte).

## Bloquée par

- Phase 8

---

## Phase 10 : Taxes — inscription + net à remettre

**User stories** : US-17, US-18

### Ce qu'on livre

Configuration des numéros d'inscription (NEQ, TPS, TVQ) dans les paramètres, et rapport
du net à remettre (taxes perçues − CTI) pour une période donnée.

### Critères d'acceptation

- [ ] Les numéros NEQ/TPS/TVQ sont configurables dans les paramètres.
- [ ] Le rapport calcule le net à remettre (perçues − CTI) pour une période choisie.

## Bloquée par

- Phase 3 et Phase 8

---

## Phase 11 : États financiers + dashboard

**User stories** : US-19, US-20

### Ce qu'on livre

Bilan et état des résultats calculés en direct depuis le grand livre, et dashboard du
portrait global (flux financiers, AP/AR, ventilation par poste).

### Critères d'acceptation

- [ ] Le bilan équilibre (actif = passif + capitaux propres) et est calculé depuis le grand livre.
- [ ] L'état des résultats est calculé depuis le grand livre, sans saisie manuelle.
- [ ] Le dashboard présente flux, AP/AR et ventilation par poste.

## Bloquée par

- Phase 3 et Phase 8

---

## Phase 12 : Piste d'audit consultable

**User stories** : US-23

### Ce qu'on livre

Historique des modifications (qui, quoi, quand) consultable dans l'interface, servant de
mécanisme de traçabilité.

### Critères d'acceptation

- [ ] Chaque modification d'écriture est journalisée (auteur, action, horodatage).
- [ ] L'historique est consultable dans l'interface.

## Bloquée par

- Phase 2

---

## Phase 13 : Clôture d'année fiscale (verrou lecture seule)

**User stories** : US-24

### Ce qu'on livre

Année fiscale configurable et clôture qui verrouille les transactions de la période en
lecture seule (passé immuable).

### Critères d'acceptation

- [ ] La date de début d'année fiscale est configurable.
- [ ] Clôturer une période passe ses transactions en lecture seule.
- [ ] Toute tentative de modification d'une transaction clôturée est bloquée.

## Bloquée par

- Phase 2

---

## Phase 14 : Corrections période clôturée via écriture d'ajustement

**User stories** : US-22

### Ce qu'on livre

Correction d'une période clôturée uniquement via une écriture d'ajustement dans la
période courante ; le passé reste immuable.

### Critères d'acceptation

- [ ] On ne peut pas modifier directement une écriture d'une période clôturée.
- [ ] Une correction se fait par écriture d'ajustement dans la période courante.

## Bloquée par

- Phase 13

---

## Phase 15 : Export dossier comptable

**User stories** : US-25

### Ce qu'on livre

Export d'un dossier (PDF + CSV/Excel) pour le comptable externe sur une période donnée.

### Critères d'acceptation

- [ ] On génère un export PDF + CSV/Excel pour une période choisie.
- [ ] Le dossier exporté est exploitable par le comptable externe.

## Bloquée par

- Phase 11 (idéalement après Phase 13)

---

## Phase 16 : Rapprochement bancaire (version simple)

**User stories** : aucune US directe (fiabilité du solde banque)

### Ce qu'on livre

Un écran pour saisir manuellement le solde du relevé bancaire à une date donnée et
afficher l'écart avec le solde du compte banque du grand livre à cette date. Pas d'import
automatique de relevé dans cette version.

### Critères d'acceptation

- [ ] On saisit un solde de relevé bancaire à une date donnée.
- [ ] L'app affiche l'écart entre ce solde et le solde du compte banque du grand livre.

## Bloquée par

- Phase 4 et Phase 8

---

## Phase 17 : Transition Zoho → app (bascule assistée)

**User stories** : aucune US directe (phase opérationnelle)

### Ce qu'on livre

Une période de fonctionnement en parallèle des deux systèmes avant la bascule complète,
avec une checklist / un mécanisme de comparaison des résultats (soldes, taxes, AP/AR)
pour valider l'équivalence avant d'abandonner Zoho.

### Critères d'acceptation

- [ ] Un mécanisme ou une checklist compare les résultats app vs Zoho (soldes, taxes, AP/AR).
- [ ] La période de parallèle permet de valider l'équivalence avant la bascule complète.

## Bloquée par

- Phases 4, 8, 10, 11, 15 (ensemble fonctionnel)

---

## Points ouverts (à trancher avant la mise en production)

- **Hébergement** : choix ouvert entre **Vercel** et une **instance AWS partagée avec n8n**.
  Ne bloque pas le découpage, mais à valider avant la prod (déploiement, latence app↔Sheet,
  colocation avec n8n).
- Hérités du PRD : date de début d'année fiscale, structure fine du plan comptable,
  format exact de l'export comptable, mécanisme précis de catégorisation.
