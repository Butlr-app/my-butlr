# Configuration de la signature électronique

Le schéma de données est appliqué séparément des fonctions Edge. Avant le premier
envoi réel :

1. Vérifier un domaine dans Resend et créer une clé API.
2. Générer deux secrets aléatoires distincts d'au moins 32 octets.
3. Configurer les secrets Supabase :

```powershell
supabase secrets set RESEND_API_KEY="re_..." `
  RESEND_FROM_EMAIL="My Butlr <signatures@votre-domaine.fr>" `
  APP_URL="https://app.votre-domaine.fr" `
  SIGNING_TOKEN_SECRET="<secret-aleatoire>" `
  SIGNING_OTP_PEPPER="<autre-secret-aleatoire>" `
  SIGNING_EMAIL_MODE="resend"
```

4. Déployer les fonctions :

```powershell
supabase functions deploy signing-envelope
supabase functions deploy signing-ceremony --no-verify-jwt
```

`signing-ceremony` est publique car les destinataires n'ont pas de compte. Elle
valide elle-même le lien opaque, l'OTP, l'expiration et le jeton court de
cérémonie. Les tables et le bucket restent privés.

Pour les tests locaux, utiliser `SIGNING_EMAIL_MODE=log`. Aucun e-mail réel
n'est envoyé dans ce mode.
