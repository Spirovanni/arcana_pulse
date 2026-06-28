# Arcana Pulse Mobile (Expo)

This is the React Native mobile client scaffold for Arcana Pulse, sharing the same API routes as the web app.

## Included

- Core screens:
  - Dashboard
  - Transactions
  - My Banks
  - Transfer
  - Assistant
- Biometric gate (`expo-local-authentication`)
- Push notification bootstrap (`expo-notifications`)
- Offline-first API caching using AsyncStorage
- Secure mobile auth session via `/api/auth/mobile-token` + bearer token headers
- Offline mutation queue + auto sync for transfers, assistant calls, and transaction mutations

## Run

```bash
cd mobile
npm install
npm run start
```

## API base URL

Set in `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://www.arcanapulse.ai"
    }
  }
}
```

## Mobile auth flow

- User signs in from the app with email/password (+ MFA code when enabled)
- API issues a mobile bearer token from `/api/auth/mobile-token`
- Tokens include a unique ID (`jti`) and are revoked on sign-out via `/api/auth/mobile-token/revoke`
- Token is stored in `expo-secure-store` (with AsyncStorage fallback)
- Shared API routes accept this token through `Authorization: Bearer <token>`

## Push notifications

- On sign-in, the app requests notification permission and obtains an Expo push token
- The token is registered via `POST /api/notifications/push-token`
- On sign-out, the app unregisters the device token via `DELETE /api/notifications/push-token`
- Server-side fan-out can send workspace alerts through Expo Push API

## Offline sync and mutation queue

- Failed mutations are queued locally when offline or on transient server failures
- Queue currently supports transfer create, assistant prompt, and transaction create/update/delete
- App auto-flushes queued mutations on app foreground and every 30 seconds while signed in
- Transaction conflicts are captured separately for user review in the Account screen

## Store publishing (Expo EAS)

1. Install EAS CLI:
   - `npm install -g eas-cli`
2. Login:
   - `eas login`
3. Configure builds:
   - `eas build:configure`
4. Set up production profile values:
   - In `eas.json`, replace `submit.production.ios.ascAppId` with your App Store Connect app ID
   - Keep signing credentials managed by Expo credentials manager
5. Build binaries:
   - iOS: `eas build --platform ios --profile production`
   - Android: `eas build --platform android --profile production`
6. Submit:
   - iOS: `eas submit --platform ios --profile production`
   - Android: `eas submit --platform android --profile production`
7. Release checklist:
   - Verify sign-in/session/logout flow on TestFlight/Internal testing
   - Verify push permission prompt and token registration endpoint
   - Verify push delivery with a test notification from backend
