# My Butlr Guest

Application mobile native Expo/React Native pour les voyageurs My Butlr.

Le projet est autonome (`package.json` et `package-lock.json` dédiés) afin de
pouvoir être déplacé tel quel dans son dépôt `my-butlr-guest-mobile`. Il utilise
le même projet Supabase que le dashboard, sans clé privilégiée et sans compte
voyageur : l’accès est limité par le `portal_access_token` de la réservation.

## Fonctionnalités du MVP

- ouverture d’une invitation par lien ou code ;
- stockage du jeton dans Keychain/Keystore avec `expo-secure-store` ;
- accueil contextualisé selon la phase du séjour ;
- informations de la villa, Wi-Fi, accès, règlement et guides ;
- demandes de services ;
- messagerie texte avec rafraîchissement toutes les 15 secondes lorsque l’écran
  est visible ;
- check-in sécurisé avec identité, document, heure d’arrivée, consentement et
  signature tactile ;
- interface française ou anglaise selon `reservation.guest_language`.

## Installation

Prérequis : Node.js 20+, npm et Expo Go compatible SDK 57, ou un development
build EAS.

```bash
cp .env.example .env
npm install
npm start
```

Variables requises :

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

La clé publishable peut être embarquée dans l’application. Ne jamais utiliser
de clé `service_role` ou de secret Supabase côté mobile.

## Invitations et deep links

Schéma natif :

```text
mybutlrguest://guest/stay/<portal_access_token>
```

Lien web avec fallback :

```text
https://mybutlr.com/guest/stay/<portal_access_token>
```

Expo Router traite automatiquement ces deux chemins. L’ouverture automatique du
lien HTTPS exige aussi les fichiers de preuve de domaine :

- `/.well-known/apple-app-site-association` avec l’Apple Team ID ;
- `/.well-known/assetlinks.json` avec l’empreinte SHA-256 Android.

Ces identifiants sont disponibles après la création des applications signées
dans Apple Developer et Google Play. Le schéma `mybutlrguest://` fonctionne
immédiatement dans un development build.

## Backend Supabase

Les écrans réutilisent les RPC du portail Guest :

- `get_guest_stay_portal`
- `guest_get_stay_messages`
- `guest_send_stay_message`
- `guest_mark_stay_messages_read`
- `guest_create_stay_service_request`

Le check-in mobile requiert la migration
`supabase/migrations/*_guest_mobile_checkin.sql` du dépôt dashboard. Elle expose
`guest_get_checkin` et `guest_submit_checkin`, résout la réservation côté serveur
et révoque l’accès direct `anon` à la table `checkins`.

## Qualité

```bash
npm run typecheck
npm test
npm run export:android
npm run export:ios
```

## Builds EAS

Après authentification Expo :

```bash
npx eas-cli build --profile development --platform all
npx eas-cli build --profile preview --platform all
npx eas-cli build --profile production --platform all
```

Les profils sont définis dans `eas.json`. Les soumissions App Store/Play Store
nécessitent les comptes développeur et les métadonnées de publication.

## Limites du MVP

- messages texte uniquement ; les images restent disponibles dans le portail web ;
- polling actif à la place de Supabase Realtime, car les voyageurs par jeton
  n’ont pas de session Auth compatible avec les policies Realtime actuelles ;
- pas encore de notifications push natives ;
- un séjour actif est conservé par appareil.
# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
