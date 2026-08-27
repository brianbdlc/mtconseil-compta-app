# PRD — App de comptabilité MT Conseil

## Problème

MT Conseil, une firme d'ingénierie/conseil au Québec, tient sa comptabilité dans Zoho Books, un SaaS généraliste qui ne colle pas à ses besoins réels et impose des flux inutiles. La firme veut sortir progressivement de cet outil au profit d'une app sur mesure, taillée pour sa réalité : réception de factures fournisseurs, facturation clients, taxes TPS/TVQ québécoises, et remise d'un dossier propre à un comptable externe. Le porteur du projet construit l'app avec des outils IA sans être développeur de formation, et possède des bases solides de comptabilité générale sans être comptable professionnel — la rigueur comptable doit donc être garantie par l'app elle-même, pas reposer sur la vigilance de l'utilisateur. Le projet s'inscrit dans un écosystème plus large d'apps interconnectées pour MT Conseil (compta, automatisation de rapports, rédaction).

## Solution

Une app de comptabilité sur mesure qui remplace graduellement Zoho Books, bâtie autour d'un grand livre en partie double où chaque événement financier devient une écriture équilibrée. L'app permet à l'opérateur de : recevoir les factures fournisseurs (saisie manuelle ou via n8n) et générer automatiquement les écritures de dépense et de paiement ; saisir les factures clients importées de Zoho et suivre les encaissements avec une balance âgée ; suivre la TPS/TVQ perçue et payée pour calculer le net à remettre ; consulter des états financiers (bilan, état des résultats) calculés en direct depuis le grand livre ; clôturer une année fiscale en verrouillant le passé ; et produire un dossier d'export pour le comptable externe. L'app démarre à zéro à la date de bascule, sans reprise de l'historique Zoho.

## Utilisateur cible

Deux personnes accèdent à l'app. **L'opérateur** (le porteur du projet) réalise la tenue de livres, la révision hebdomadaire des dépenses, la saisie de l'AR et les clôtures ; il maîtrise la compta générale mais n'a pas d'expérience des logiciels comptables professionnels. Un **contact interne MT Conseil** (associé/gestionnaire) consulte l'état financier et valide. Les deux rôles sont distincts au niveau des permissions dès le départ.

## User Stories

**Authentification & rôles**
- **US-1** — En tant qu'utilisateur, je veux me connecter par courriel + mot de passe et réinitialiser un mot de passe oublié, afin d'accéder à l'app de façon sécurisée.
- **US-2** — En tant qu'opérateur, je veux un accès complet (saisie, écritures, clôtures) tandis que le contact MT Conseil a un accès de consultation/validation, afin que chacun voie ce qui le concerne.

**Comptes fournisseurs (AP)**
- **US-3** — En tant qu'opérateur, je veux saisir manuellement une facture fournisseur, afin d'enregistrer une dépense sans dépendre d'une automatisation.
- **US-4** — En tant qu'opérateur, je veux que l'app reçoive les données de factures fournisseurs via n8n (clé API et/ou requête HTTP), afin d'automatiser la saisie depuis le flux OCR externe.
- **US-5** — En tant qu'opérateur, je veux qu'à la réception d'une facture l'app génère l'écriture (dépense au débit, TPS/TVQ payée [CTI] au débit, comptes fournisseurs à payer au crédit), afin que la dépense soit comptabilisée correctement.
- **US-6** — En tant qu'opérateur, je veux marquer une facture « payée » et générer la deuxième écriture (fournisseurs à payer au débit, banque au crédit), afin de refléter le décaissement.
- **US-7** — En tant qu'opérateur, je veux que chaque dépense soit catégorisée par poste comptable avec une suggestion que je peux corriger, afin d'imputer la dépense au bon compte.
- **US-8** — En tant qu'opérateur, je veux que l'app reconnaisse les dépenses récurrentes (même fournisseur + montant similaire + fréquence régulière), afin d'éviter un traitement complet à chaque fois.
- **US-9** — En tant qu'opérateur, je veux consulter la facture source (image/PDF) rattachée à chaque entrée, afin de vérifier la donnée contre la pièce d'origine.

**Rituels hebdomadaires**
- **US-10** — En tant qu'opérateur, je veux un parcours de tenue de livres pour saisir et générer les écritures, afin de tenir la compta à jour chaque semaine.
- **US-11** — En tant qu'opérateur, je veux un parcours de révision distinct pour contrôler les entrées et les corriger dans l'app (jamais dans le Sheet), afin d'assurer la qualité avant que la période soit figée.

**Comptes clients (AR)**
- **US-12** — En tant qu'opérateur, je veux importer manuellement les factures clients (émises via Zoho), afin de suivre les revenus sans sync API.
- **US-13** — En tant qu'opérateur, je veux que l'app génère l'écriture AR (clients à recevoir au débit, revenus + taxes perçues au crédit), afin de comptabiliser le revenu.
- **US-14** — En tant qu'opérateur, je veux marquer un encaissement (banque au débit, clients à recevoir au crédit), afin de refléter la réception du paiement.
- **US-15** — En tant qu'opérateur, je veux un rapport de balance âgée par client (0-30 / 30-60 / 60-90+ jours), afin de voir l'ancienneté des créances au-delà d'un simple statut payé/impayé.

**Taxes TPS/TVQ**
- **US-16** — En tant qu'opérateur, je veux que chaque ligne de dépense/revenu porte un code de taxe (TPS 5 %, TVQ 9,975 %), afin de suivre séparément taxes perçues (passif) et CTI (actif).
- **US-17** — En tant qu'opérateur, je veux un rapport du net à remettre (perçues − CTI) pour une période, afin de préparer la remise fiscale.
- **US-18** — En tant qu'opérateur, je veux configurer les numéros d'inscription (NEQ, TPS, TVQ) dans les paramètres, afin qu'ils apparaissent sur les documents.

**États financiers & dashboard**
- **US-19** — En tant qu'utilisateur, je veux un bilan et un état des résultats calculés automatiquement depuis le grand livre, afin de ne jamais les saisir à la main.
- **US-20** — En tant qu'utilisateur, je veux un tableau de bord du portrait global (flux financiers, AP/AR, par poste), afin d'avoir une vue d'ensemble.

**Intégrité comptable & audit**
- **US-21** — En tant qu'opérateur, je veux qu'il soit impossible d'enregistrer une écriture déséquilibrée, afin que la partie double ne soit jamais violée.
- **US-22** — En tant qu'opérateur, je veux corriger une période clôturée uniquement via une écriture d'ajustement dans la période courante, afin que le passé reste immuable.
- **US-23** — En tant qu'utilisateur, je veux consulter dans l'interface l'historique des modifications (qui, quoi, quand), afin de disposer d'une piste d'audit.

**Clôture & export**
- **US-24** — En tant qu'opérateur, je veux clôturer une année fiscale pour verrouiller ses transactions en lecture seule, afin de figer la période.
- **US-25** — En tant qu'opérateur, je veux exporter un dossier (PDF + CSV/Excel) pour le comptable externe, afin de lui remettre une comptabilité exploitable.

## Critères de succès

- Sur toute période, la somme des débits égale la somme des crédits et le bilan équilibre (actif = passif + capitaux propres) — écart de 0 $, vérifiable par requête sur le grand livre.
- Une facture fournisseur parcourt tout son cycle dans l'app — réception → écriture → marquée payée → écriture de paiement — sans recourir à Zoho.
- L'app produit le net de TPS/TVQ à remettre (perçues − CTI) pour une période donnée.
- L'app produit les fichiers d'export (PDF + CSV/Excel) pour le comptable externe sur une période donnée.

## Hors périmètre

- Migration des données historiques de Zoho Books (l'app démarre à zéro).
- Synchronisation API automatique avec Zoho Books (l'AR est importé manuellement, du moins pour l'instant).
- Multi-devises, paie, gestion d'inventaire.
- Conseils fiscaux officiels ou validation professionnelle des chiffres — un CPA externe reste responsable de la validation finale avant remises réelles.
- Sécurisation avancée / durcissement final — confié à un développeur externe mandaté séparément.
- Le déclencheur de réception des factures fournisseurs et la logique anti-doublon sont gérés côté n8n, hors de l'app.

## Décisions d'implémentation

- **Partie double inviolable** : impossible d'enregistrer une écriture dont débits ≠ crédits ; la contrainte est garantie au niveau des données, pas seulement dans l'interface.
- **Passé immuable** : une fois une période clôturée, ses transactions passent en lecture seule ; toute correction se fait par écriture d'ajustement dans la période courante.
- **Deux voies d'ingestion des dépenses** : saisie manuelle par l'opérateur, ou réception via n8n (l'app expose un point d'intégration par clé API et/ou requête HTTP). La zone tampon Google Sheet reste côté n8n.
- **Mécanisme de catégorisation modulaire** : le mapping dépense → poste comptable (règles, LLM, ou manuel) est conçu de façon interchangeable ; l'opérateur voit une suggestion qu'il peut corriger. Mécanisme précis à concevoir.
- **Deux rituels hebdomadaires distincts** : tenue de livres (saisie/écritures) et révision (contrôle qualité) sont deux parcours séparés. Les corrections se font dans l'app, jamais dans le Sheet.
- **Balance âgée** par tranches 0-30 / 30-60 / 60-90+ jours, groupée par client.
- **Taxes** : TPS 5 % et TVQ 9,975 %, perçues (passif) et CTI (actif) suivies séparément ; code de taxe par ligne.
- **Année fiscale configurable** dans les paramètres ; date de début exacte à confirmer avec MT Conseil.
- **Plan comptable générique au démarrage** (5 catégories : actifs, passifs, capitaux propres, revenus, dépenses), ajustable en cours de route ; structure fine à préciser.
- **Format d'export** : PDF + CSV/Excel ; format exact à déterminer avec le comptable externe.
- **Deux rôles** : opérateur (accès complet) et contact MT Conseil (consultation/validation), séparés par les permissions.

## Notes complémentaires

- **Écosystème futur** : l'architecture de données doit rester raisonnablement ouverte à l'interconnexion avec d'autres apps MT Conseil (rapports, rédaction), sans sur-ingénierie prématurée.
- **Dépendance externe n8n** : le flux OCR (Mistral), la zone tampon Google Sheet, le déclencheur de réception et la logique anti-doublon vivent côté n8n ; l'app en dépend mais ne les construit pas.
- **Points ouverts à trancher plus tard** : date de début d'année fiscale, structure fine du plan comptable de MT Conseil, format exact de l'export comptable, mécanisme précis de catégorisation.
- **Découpage en phases** : le présent document décrit le *quoi* ; le découpage en phases de développement sera fait séparément une fois ce cadrage validé.
- **Hypothèse à valider** : rôle de consultation/validation du contact MT Conseil supposé en lecture seule — à confirmer si une capacité de validation active (approbation d'écritures) est souhaitée.
