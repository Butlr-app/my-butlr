# Audit — Version mobile (My Butlr)

**Date :** 2026-07-13  
**Périmètre :** `/guest`, `/partner`, `/hm`, shells `MobileLayout`/`BottomNav`, PWA, routage rôles, `/app` responsive  
**Verdict :** 3 apps mobiles distinctes + dashboard staff responsive. **HM est le plus mature** (~8/10). Guest/Partner sont visuellement soignés mais incomplets (~5/10). Les P0 système (landing HM, PWA `/app`, pas de e2e) bloquent une mise en production mobile cohérente.

---

## 1. Architecture

```mermaid
flowchart TB
  Login[Login / Signup] --> RH{roleHome}
  RH -->|guest| G[/guest]
  RH -->|partner| P[/partner]
  RH -->|HM / concierge / owner / agency| A[/app]
  A -.lien latéral.-> HM[/hm]
  G --> ML[MobileLayout + BottomNav]
  P --> ML
  HM --> ML
```

| Shell | Routes | Thème | Utilisateurs |
|---|---|---|---|
| Guest | `/guest/*` | Light `#FAFAF8` | guest (+ owner bypass) |
| Partner | `/partner/*` | Dark | partner (+ owner bypass) |
| House Manager | `/hm/*` | Light + offline | HM, concierge, owner, agency |
| Staff responsive | `/app/*` | Tokens design | owner, HM, concierge, agency |

Primitives partagées : `src/components/mobile/MobileLayout.tsx`, `BottomNav.tsx`.

---

## 2. Matrice fonctionnelle

### Guest
| Capacité | État |
|---|---|
| Explore / Stays / Services / Guides / Messages | ✅ data live |
| Search bar Explore, Concierge Picks, Book now | ❌ stubs |
| Likes | local only |
| Profile menus | ❌ stubs (sauf logout) |
| i18n | ❌ EN hardcodé (sauf Guides) |
| Offline / push | ❌ |

### Partner
| Capacité | État |
|---|---|
| Dashboard / Earnings | ✅ |
| Bookings | lecture seule |
| Services toggle/CRUD | ❌ boutons morts |
| Profile menus | ❌ stubs |
| i18n / offline / push | ❌ |

### House Manager
| Capacité | État |
|---|---|
| Today / Tasks / Incidents / Notifs / Profile | ✅ |
| i18n FR/EN | ✅ |
| Offline cache + queue | ✅ (écriture tasks/incidents ; photos droppées offline) |
| Push | ✅ |

### `/app` sur téléphone
Sidebar drawer + bottom nav 4 items + Menu — **utilisable** mais dense (tables, topbar).

---

## 3. Findings par sévérité

### Critique
1. **Aucun e2e mobile** — Playwright Desktop Chrome only ; zéro couverture `/guest|/partner|/hm`.

### Haute
2. **`roleHome` ignore HM/concierge** → landing `/app` au lieu de `/hm`.
3. **PWA `start_url` + push** ciblent `/app` pour tous les rôles.
4. **Guest bottom nav = 6 onglets** — trop dense (`text-[10px]`).
5. **`/hm` sans `allow` sur `ProtectedRoute`** — flash + hooks inutiles avant redirect.

### Moyenne
6. Guest/Partner quasi full EN alors que langue défaut = FR.
7. `GuestMessages` : `ChatThread` hauteur fixe `480px`.
8. Pas de `safe-area-inset-top` (notch / offline banner).
9. Profile & actions partner stub.
10. `InstallPrompt` (`bottom-4`, z-60) chevauche la bottom nav.
11. Owner dans `allow` guest/partner — preview flou.
12. Signup ne propose pas `guest`.

### Basse
13. Ratings fake, Concierge Picks hardcodés.
14. Deux composants nommés `BottomNav` (layout vs mobile).
15. Compteur contracts global dans GuestProfile.
16. `roleHome` non testé unitairement.

---

## 4. Correctifs livrés dans cette PR

| Fix | Fichiers |
|---|---|
| Audit documenté | `docs/audit-mobile.md` |
| `roleHome` → `/hm` pour house_manager & concierge | `roleContext.tsx` + tests |
| `ProtectedRoute allow` sur `/hm` | `App.tsx` |
| Guest nav ≤5 (Guides accessible depuis Explore) | `GuestLayout`, `GuestExplore` |
| Chat mobile plein écran | `GuestMessages` |
| `safe-area-top` + padding headers / banner HM | `index.css`, layouts |
| Manifest shortcuts multi-rôles | `manifest.webmanifest` |
| InstallPrompt au-dessus de la nav | `InstallPrompt.tsx` |
| Playwright projet Mobile + smoke shells | `playwright.config.ts`, `e2e/mobile.spec.ts` |

---

## 5. Roadmap restante

### P1
- i18n complète guest + partner
- Actions bookings partner (`updateRequest`)
- Profiles guest/partner : linker settings réels ou masquer stubs
- Signup `guest` + redirect partner hors onboarding staff
- E2E login par rôle (compte guest/partner/HM dédiés)

### P2
- Offline guest (cache résa + queue service requests)
- CRUD services partner
- Tokens design unifiés (amber guest vs tokens `/app`)
- Renommer `layout/BottomNav` → `AppBottomNav`
- Topbar `/app` simplifiée `< md`

---

## 6. Score

| Surface | Avant | Après P0 PR |
|---|---|---|
| Routage rôles | 4/10 | 8/10 |
| Guest UX | 5/10 | 6.5/10 |
| Partner UX | 5/10 | 5/10 (lecture) |
| HM field | 8/10 | 8.5/10 |
| PWA multi-rôle | 3/10 | 6/10 |
| Tests mobile | 0/10 | 4/10 (smoke) |

**Global mobile : ~5/10 → ~7/10** après P0. Production guest/partner : i18n + stubs + offline (P1/P2).
