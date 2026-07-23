# My Butlr v1.0 — Project Brief & Templates

## Vision
Luxury property management SaaS for villas, yachts, and concierge services.
Target market: High-end property owners, house managers, concierge agencies in France and internationally.

## Key Differentiators
1. **Contract Generator** — Auto-generate legally compliant French seasonal rental contracts as PDFs
2. **Invoice Generator** — Complementary billing for services, repairs, food purchases
3. **Multi-role dashboard** — 6 roles with different views (Owner, House Manager, Concierge, Agency, Partner, Guest)
4. **Monochrome premium design** — No brand colors, pure black/white/grey aesthetic

## Contract Template Structure
Based on: Contrat_Location_Villa_The_French_Way_PAVARD.pdf

```
CONTRAT DE LOCATION SAISONNIÈRE
[Property Name]
Location: [City/Region]

LE BAILLEUR (Owner/Landlord)
[Company Name], [Legal Rep]
RCS [City] [Number]
[Address]
[Phone] [Email]

LE LOCATAIRE (Tenant)
[Full Name]
[Address]
[Phone] [Email]
DOB: [Date] | Nationality: [Country]
ID: [Passport/ID Number]

INTERMÉDIAIRE (Intermediary)
[Concierge Company Name]

ARTICLES:
1. Parties au contrat
2. Le séjour (dates, property address, capacity)
3. Montant et modalités de paiement (rent, deposit, taxes)
4. Dépôt de garantie (30 000€ example)
5. Détails de la propriété (surface, rooms, amenities)
6. Services inclus (breakfast, cleaning, house manager, etc.)
7. Règles de comportement et usage des lieux
8. Sécurité et usage des installations
9. Conditions d'annulation et remboursement
10. Check-in / Check-out
11. Sous-location et cession
12. Force majeure
13. Confidentialité
14. Prises de vue et usage commercial
15. Droit applicable et juridiction

SIGNATURES:
Fait en deux (2) exemplaires originaux
[Date]
LE BAILLEUR: [Name, Title, Signature]
LE LOCATAIRE: [Name, Signature]
Mention: "Lu et approuvé"
```

## Invoice Template Structure
Based on: FC-2026-014 (Abigail Duffine)

```
FACTURE
Numéro: FC-YYYY-XXX
Émise le: [Date]
Échéance: [Date + 30 days]

ÉMETTEUR (From):
SAS EBSCOPAL
65 rue de la Garriguette
34130 Saint-Aunès, France
SIRET: 90144940500025
TVA: FR61901449405
Email: contact@frenchw.com
Tél: +33 7 81 62 23 97

CLIENT (To):
[Client Name]
[Client Address]
Client reference: [Ref]

LIGNES:
| Description | Prix unitaire | % TVA | Quantité | Montant total HT |
|-------------|---------------|--------|----------|------------------|
| [Item 1]    | [Price]       | 20,00  | [Qty]    | [Total]          |
| [Item 2]    | [Price]       | 20,00  | [Qty]    | [Total]          |
| ...         |               |        |          |                  |

Sous-total HT: [Amount]
TVA (20,00%): [Amount]
TOTAL TTC: [Amount]

La présente facture est payable comptant à réception.
En l'absence de règlement dans les délais, la réservation de la villa pourra être annulée sans préavis.
```

## Company Details (reusable)
- **Company**: SAS EBSCOPAL
- **Legal Rep**: M. Emmanuel Béguier
- **RCS**: Montpellier 901 449 405
- **SIRET**: 901 449 405 00025
- **TVA**: FR61901449405
- **Address**: 65 rue de la Garriguette, 34130 Saint-Aunès, France
- **Phone**: +33 7 81 62 23 97
- **Email**: contact@frenchw.com

## Property Details (reusable)
- **Name**: Villa The French Way
- **Address**: 3 corniche de Bartole, 83310 Grimaud, France
- **Type**: Villa
- **Bedrooms**: 8 doubles
- **Bathrooms**: 8
- **Max Guests**: 16
- **Surface**: ~980 m²
- **Amenities**: Pool, indoor pool, gym, game room, cinema, hammam, jacuzzi, sauna, AC, Wi-Fi
- **Services**: Daily breakfast, daily cleaning (4h), linen change weekly, house manager, welcome cocktail

## Development Priorities
1. Supabase CRUD (all pages)
2. Auth flow
3. Contract Generator
4. Invoice Generator
5. Settings (full)
6. Notifications
7. SEO/Polish
8. README/Docs
