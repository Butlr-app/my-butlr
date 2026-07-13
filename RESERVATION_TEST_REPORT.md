# Rapport de validation — module Réservations

Date : 10 juillet 2026

## Résultat

Le workflow couvre les quatre modes :

- `to_prepare` : réservation client, contrat en brouillon, paiement en attente.
- `already_done` : réservation client, contrat signé, paiement en attente.
- `concierge` : réservation client, contrat en brouillon géré par la conciergerie.
- `none` : blocage calendrier, sans client, contrat ni paiement.

## Tests automatisés

- Vitest / Testing Library : 25 tests réussis.
- Couverture ciblée : 82,09 % des instructions, 84,76 % des lignes.
- Playwright : 4 tests smoke réussis sur desktop et mobile.
- Deux parcours Playwright authentifiés sont configurés mais ignorés sans
  `E2E_OWNER_EMAIL` et `E2E_OWNER_PASSWORD`.
- Lint : aucune erreur ; trois avertissements Fast Refresh préexistants.
- TypeScript et build Vite : réussis.

## Base Supabase

Les migrations distantes suivantes sont appliquées :

- `reservation_contract_workflow`
- `reservation_integrity_rls_sync`
- `tenant_safe_property_access`
- `property_owner_policy_isolation`

Vérifications transactionnelles exécutées puis annulées :

- création des quatre modes ;
- synchronisation de 4 événements calendrier, 3 contrats et 3 paiements ;
- refus d’un chevauchement ;
- refus d’un dépassement de capacité ;
- lecture de sa propre réservation par un owner ;
- absence de fuite de cette réservation vers un autre owner.

Les contraintes distantes de dates, capacité, montant et cohérence du workflow
sont présentes. Les politiques RLS des réservations, contrats, paiements et
événements calendrier sont limitées aux propriétés accessibles.

## Effets transverses contrôlés

- Les blocages et réservations annulées ne gonflent plus les métriques
  commerciales du dashboard et des rapports.
- Le portail invité ignore les blocages de dates.
- Le jour de départ est une borne exclusive dans le calendrier.
- Les nouvelles réservations synchronisent automatiquement calendrier,
  contrats et paiements.
- Une réservation peut être annulée depuis son détail ; l’événement calendrier
  correspondant est alors retiré.
- Les propriétés inactives ou en maintenance ne sont pas proposées à la
  création.

## Point de données historique

La base contient un chevauchement antérieur entre « M. & Mme Laurent » et
« Test Guest » sur Villa French Way. Il n’a pas été supprimé ni modifié.
Le garde-fou empêche les nouveaux chevauchements et les mises à jour qui en
créeraient.

## Commandes

```text
npm run check
npm run test:coverage
npm run test:e2e
```
