# Home Screen login setup

Login now prepares IndexedDB persistence with localStorage fallback before enabling
sign-in. The Google popup starts directly from the tap, without a storage await.
Guest actions wait for saved account restoration. No custom token cache is added.

## Enable same-origin Google redirect for installed apps

These external settings must be completed before enabling the redirect path:

1. Firebase Authentication → Settings → Authorized domains: add
   `luma.wildsaura.com` if missing.
2. Google Cloud → the OAuth Web client used by Firebase Google sign-in:
   add `https://luma.wildsaura.com/__/auth/handler` to Authorized redirect URIs.
   Keep existing URIs.
3. Set Vercel's production `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=luma.wildsaura.com`
   and redeploy. Keep the existing Firebase project ID and other config values.
4. Verify `/__/auth/iframe` serves the Firebase helper through the rewrite,
   without a 404 or cross-origin redirect. Do not service-worker-cache `/__/auth/`.

Installed apps use redirect only when authDomain matches the current HTTPS host.
Other hosts retain the improved popup flow. This PR does not change OAuth console
settings or Vercel environment variables.

Sources:
- https://firebase.google.com/docs/auth/web/redirect-best-practices
- https://firebase.google.com/docs/auth/web/auth-state-persistence

## Device verification

Test email and Google login inside the installed app, fully close/reopen, and
confirm the same account restores. Verify Google cancellation, explicit sign-out,
blocked storage errors, and migration of an existing localStorage account.
A guest who liked a photo must still see the login form at /login.

Safari and Home Screen apps can have separate storage. Sign in inside the app.
Clearing website data or removing the app can clear saved credentials. Offline
page caching is separate from authentication persistence.
