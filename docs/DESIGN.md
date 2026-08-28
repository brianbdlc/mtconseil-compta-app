# Design System — MT Conseil Compta

> Direction : **« Precision Utilitarian »** — le sérieux d'un vrai logiciel financier.
> *Memorable thing* : **rigueur & confiance** (« ça ne peut pas se tromper »).
> Chaque décision ci-dessous sert cette chose. Preview de référence : `/tmp/design-preview-*.html`.

## Product Context
- **Quoi** : app de comptabilité en partie double sur mesure pour MT Conseil, qui remplace graduellement Zoho Books — grand livre, factures fournisseurs (AP), factures clients (AR), TPS/TVQ, états financiers, clôture d'exercice, export pour comptable externe.
- **Pour qui** : deux utilisateurs avertis en compta générale. L'**opérateur** (tenue de livres, saisie, révision, clôtures — accès complet) et le **contact interne MT Conseil** (consultation/validation).
- **Espace** : outil comptable / fintech B2B. Références : Mercury (propreté), Stripe (tables financières), Ramp (hiérarchie), Pennylane / Xero (compta).
- **Type** : outil interne / dashboard data-dense.
- **Memorable thing** : rigueur & confiance — la rigueur comptable est garantie par l'app, pas par la vigilance de l'utilisateur.

## Aesthetic Direction
- **Direction** : Precision Utilitarian — data-first, surfaces calmes et refined. Ni brutalist brut, ni SaaS gonflé.
- **Décoration** : minimal — la typographie, la grille stricte et les tabular-nums font tout le travail. Zéro ornement.
- **Mood** : un grand livre de confiance, moderne mais ancré. La rigueur visuelle *est* le message : chaque chiffre est aligné, chaque écriture est équilibrée, rien ne décore pour décorer.
- **First principles** (propres à ce produit) :
  1. Assumer la partie double — les utilisateurs maîtrisent la compta ; on montre débits/crédits au lieu de les cacher (contraire au fintech grand public).
  2. Traiter les états financiers (bilan, résultats) comme des **documents formels** → serif dédié.
- **Références** : [Fintech Dashboard Design 2026](https://adminlte.io/blog/fintech-dashboard-design-examples/) · [Fintech Design Patterns](https://www.themasterly.com/blog/fintech-dashboard-design-guide)

## Typography
- **Display/États** : **Fraunces** (soft-serif, optical sizes) — titres d'états financiers, en-têtes de bilan/résultats, grands totaux, titres de page/rapport. **RÉSERVÉ à ces contextes** ; jamais dans le chrome dense (sinon ça vieillit). Évoque le document comptable officiel → confiance.
- **Body + Data/Tables** : **Geist** (`font-variant-numeric: tabular-nums` sur tous les montants) — chrome, formulaires, nav, labels, tables, montants alignés. Engineered et précis = « rigueur ».
- **Code/Mono** : **JetBrains Mono** — n° de compte, clés API n8n, payloads d'intégration, aperçus CSV d'export.
- **Loading** (Google Fonts) :
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  ```
- **Scale** (px) : 11 / 12 / 13 / 14 / 15 / 19 / 26 / 30 / 38 / 44 / 56
  - Corps UI 13-15 · labels/meta 11-12 · titres de section 19-30 (Fraunces) · titres d'états 38 · grands totaux 44 · hero 56.

## Color
- **Approche** : restrained — neutres papier chauds + un accent ink navy d'autorité. La couleur sémantique (vert/rouge/ambre) ne décore **jamais** : elle porte le signe comptable.
- **Primary / Ink** : `#16324F` — marque, nav active, boutons primaires, titres, focus ring. Hover : `#1F4266`. Tint clair : `#E1E8EF`.
- **Fond papier** : `#FAF9F6` — fond app (chaud, évoque le grand livre, se distingue de Zoho). Surface cartes/tables : `#FFFFFF`.
- **Neutrals** (clair → foncé) : `#EFEDE7` → `#E5E3DD` (bordures) → `#B7B4AC` → `#6B7280` (texte secondaire) → `#3A3F46` → `#1A1D21` (texte principal).
- **Semantic** :
  - Crédit / positif / payé : `#137547` (fond `#E7F1EB`)
  - Débit / négatif / déséquilibre : `#B4232A` (fond `#F7E7E7`)
  - Warning / balance âgée / échéance : `#B7791F` (fond `#F6EDDB`)
  - Info : `#2B5C8A` (fond `#E4EDF4`)
  - Usage compta : crédit/débit et signe des soldes ; TPS perçue (passif) vs CTI (actif) ; tranches balance âgée 0-30 / 30-60 / 60-90+.
- **Dark mode** : light-first (outil de tenue de livres de jour). Dark = inversion sur surfaces ink **désaturées** (fond `#12161C`, jamais noir pur ; surface `#1A1F26`) ; conserver les accents sémantiques légèrement éclaircis pour l'AA.

## Spacing
- **Base** : 4px.
- **Densité** : dense-mais-respirant — lignes de table ~38px, padding page généreux (24-48px). Data-dense sans étouffer.
- **Scale** : 2xs(2) xs(4) sm(8) 12 md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout
- **Approche** : grid-disciplined — app-shell avec sidebar, colonnes strictes, alignement prévisible. La grille visible = la rigueur ressentie.
- **Grid** : app-shell `sidebar 220px + contenu fluide` ; contenu en colonnes strictes (ex. stat cards en 4 colonnes → 2 → 1 selon breakpoint). Sidebar masquée < 820px.
- **Max content width** : ~1120px pour les vues de lecture/rapport ; les tables de grand livre peuvent aller pleine largeur avec `overflow-x:auto`.
- **Border radius** : sm 4px · md 6px · lg 8px · full 9999px (pills de statut uniquement). Précis, non-bubble.

## Motion
- **Approche** : minimal-fonctionnel — uniquement ce qui aide la compréhension. Confiance = calme, aucun bounce.
- **Cas** : feedback de sauvegarde d'écriture, ouverture/expansion de ligne, transition de statut (impayé→payé), verrouillage visuel à la clôture d'exercice.
- **Easing** : enter `ease-out` · exit `ease-in` · move `ease-in-out`.
- **Duration** : micro 50-100ms · court 150-250ms · moyen 250-400ms · long 400-700ms (réservé au verrouillage de clôture).

## Decisions Log
| Date | Décision | Rationale |
|------|----------|-----------|
| 2026-08-27 | Création initiale — système « Precision Utilitarian » | `/design` — outil interne data-dense, memorable = rigueur & confiance. Validé globalement par le porteur, sans drill-down. |
| 2026-08-27 | Fraunces réservé aux états financiers (risk assumé) | Les états (bilan/résultats) sont des documents formels ; le serif installe la confiance et différencie du SaaS générique. Discipline : jamais dans le chrome dense. |
| 2026-08-27 | Fond papier chaud `#FAF9F6` vs gris froid (risk assumé) | Calme, évoque le grand livre, se distingue de Zoho. À surveiller : contraste AA sur tables denses. |
| 2026-08-27 | Geist + tabular-nums pour toutes les données | Alignement des montants = rigueur comptable non négociable. |
| 2026-08-27 | Sémantique couleur disciplinée (vert/rouge/ambre) | Crédit/débit, TPS perçue/CTI, balance âgée — la couleur porte le sens comptable, jamais la déco. |
