# Schoolglass Desk mobile (M1 + M2)

This Expo/React Native app uses the existing Schoolglass Desk API. It is an early foundation preview, not complete mobile feature parity. Android and iOS source are supported; native device acceptance is still pending.

## Install and start

From the repository root, install the mobile dependencies separately from the website:

```powershell
npm --prefix apps/mobile ci
npm run mobile:start
```

For a physical iPhone, first sign in to the same free Expo account in Expo CLI and Expo Go (steps below). Install Expo Go on your Android/iPhone. Use the SDK-compatible version shown by Expo. Put phone and PC on the same Wi-Fi, then scan the terminal QR code (Expo Go on Android, Camera/Expo Go on iPhone). The Metro development server requires this PC while previewing; the live website remains independent. Router, secure storage and other modules used here are included in the compatible Expo Go client; if client/SDK versions differ, use a matching client or a development build.

The default API is https://schoolglass.jatinsinghrautela.com/api. Only sign in to live accounts deliberately; attendance/fees/etc. are not written by this foundation. Password change/reset/logout are real operations, even from a preview. Ordinary tests use isolated demo memory and never live credentials. Do not publish credentials or student screenshots.

For local dummy data, start the API from a separate terminal with explicit demo settings and no cloud credentials. Bind to 0.0.0.0 for phone LAN access, choose port 4100, and use your PC LAN address (not localhost) in apps/mobile/.env:

Run the following from the repository root in a NEW PowerShell terminal; these variables apply to that terminal only. Run `npm ci` first if root API dependencies are not installed.

```powershell
$env:DOTENV_CONFIG_PATH = 'apps/api/data/nonexistent-mobile-demo.env'
$env:NODE_ENV = 'test'
$env:DEPLOYMENT_PROFILE = 'local'
$env:DATA_MODE = 'demo'
$env:FILE_STORAGE = 'local'
$env:HOST = '0.0.0.0'
$env:PORT = '4100'
$env:TRUST_PROXY = ''
$env:PUBLIC_APP_URL = ''
$env:UPLOAD_SCAN_MODE = 'disabled'
node apps/api/src/server.js
```

Then set apps/mobile/.env before starting Expo:

```text
EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:4100
```

Allow only private-network firewall access if Windows asks. Keep the API on trusted LAN only. Restart Expo after an environment change. Do not change or overwrite your existing MySQL/cloud environment. The in-memory demo sign-ins are principal@orbit.local, teacher@orbit.local and student@orbit.local with OrbitDemo123!; these are not live-site accounts. Review public environment values before building. Production bundles require HTTPS. No database or R2 secrets belong in EXPO_PUBLIC variables.

## iPhone: Expo sign-in required

Expo Go for SDK 57 on a physical iPhone requires the same Expo account on the PC and phone. This is separate from your Schoolglass Desk login and does not require paid Apple membership.

1. Create a free account at https://expo.dev/signup if needed.
2. Keep the development server running. In a SECOND PowerShell terminal:

```powershell
cd "D:\Personal Projects\School Management\apps\mobile"
npx expo login
npx expo whoami
```

3. Complete the sign-in flow privately. On iPhone, open Expo Go → Go home → account/avatar icon → sign in to the SAME Expo account.
4. Tap Try again or rescan the QR code. If you switched from a different Expo account, stop/restart Metro using npm run mobile:start from the repository root and scan the new QR.
5. After Schoolglass Desk opens, use the school account credentials on its own sign-in screen.

No code or database change fixes an Expo account mismatch. Do not share Expo passwords/tokens in chat or Git. Android currently does not have the same physical-iOS requirement, but signing in is recommended. See [official troubleshooting](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/) and [SDK 57 login announcement](https://expo.dev/changelog/expo-go-57-login).

## Included

- Bearer login and native secure token storage; server-validated restore.
- Mandatory first-login password change and reset-request form (delivery still depends on backend configuration).
- School-aware identity/logo, school switch only for multiple schools and a small permission-scoped overview.
- Account/appearance navigation; follows system on launch with explicit light/dark override for this app session.
- Server revalidation on foreground; previous school data cleared on switching; stale requests ignored.
- Local clearing on logout, server revocation attempt, explicit warning if revocation cannot be confirmed.
- Loading/retry/error handling including Render cold starts and Cloudflare non-JSON challenges.

Student and guardian daily views are now included: notices, homework/resources, dated timetable, calendar, attendance, published results, fees/receipts and private gallery. See ../../docs/MOBILE-DAILY-VIEWS.md for role setup, backend deployment and phone checks. Homework submission, push, offline writes and complete staff/owner tools remain later work. No persistent school-record cache is used. Web preview intentionally keeps tokens in memory instead of browser persistence; it does not verify native SecureStore behavior. New screens will use existing backend permissions and protected file routes.

## Verify

```powershell
npm run mobile:check
cd apps/mobile
npx expo-doctor
npx expo export --platform android --platform ios
```

JS export is not a signed APK/IPA or proof of native device behavior. Native build/signing, keyboard/back gestures, safe areas, screen readers, secure persistence and foreground/session expiry must be tested on phones. Expo's free cloud build allowance is limited; no paid subscription or submission is enabled here.

## Troubleshooting

- QR cannot connect: same network, no guest-network client isolation/VPN conflict, private firewall rule, correct PC address. Tunnel is optional and must not be treated as a free always-on host.
- SDK mismatch: use the compatible Expo Go version or a development build; do not downgrade packages independently.
- Blank/challenge response: check Cloudflare events and API URL. A native client cannot solve an HTML browser challenge as JSON; review targeted configuration without disabling site protection globally.
- First API call slow: Render may be waking up. Retry manually; do not add recurring keep-awake traffic.
- Lost server session: app requests sign-in. Network failure during restore locks private screens until retry; it does not show stale records.

See docs/MOBILE-PLAN.md for the complete phased scope, distribution costs and acceptance gates.

## Dependency audit — preview release gate

The isolated mobile dependency audit on 15 October 2026 reports 21 findings (18 high, 3 moderate) propagated from three upstream advisories: braces GHSA-vfj7-8cjw-p6xm, node-forge GHSA-86w9-cpqp-85rv and decode-uri-component GHSA-vcc3-ghjq-m6fr. The installed braces/node-forge versions are the latest available when checked. The decoder fix is ESM-only in a new major version; Expo Router's existing query-string dependency uses CommonJS, so no unsafe override or SDK downgrade was applied. UUID is overridden to patched 11.1.1 and SDK patch updates were applied. Treat remaining findings as release-review blockers, not a clean audit claim. Do not expose Metro to the public internet, enable remote update signing or accept untrusted app links as part of this preview. Upgrade/review compatibility before wider distribution. These dependencies are isolated from the unchanged Render web/API installation.

## Cold starts and mobile sign-in timeouts

Sign-in and saved-session restore first make ONE unauthenticated /api/ready request with a 90-second startup deadline. Credentials are sent only after readiness succeeds. School GET requests also allow up to 90 seconds when an already-open app encounters a sleeping server. Other requests retain their 25-second deadline; there is no automatic retry of login/password changes and no background keep-awake polling. The screen shows connection progress. Timeout messages identify server connection, sign-in, account validation or school workspace so device/network issues can be distinguished.

If it still times out, open https://schoolglass.jatinsinghrautela.com/api/ready on the SAME phone, then reload Expo Go using r in the Metro terminal and retry once. A browser-ready response proves browser reachability, not native-client acceptance by the network/Cloudflare. Record the exact new operation message and check Cloudflare Security Events/Render logs before changing protection. Never globally disable bot protection or alter passwords to fix a timeout. Keep EXPO_PUBLIC_API_URL unset for the default live domain unless deliberately using a LAN demo API.

## Daily workflows and glass layout

See [mobile coverage and deployment](../../docs/MOBILE-WORKFLOWS.md). Student homework answers/attachments, teacher workflows and leadership daily services extend M2. Glass is the selected style, with the website mint/teal brand. The compact dashboard has feature search, a school/service title top bar with Sign out, and bottom navigation; Services mirrors the website sidebar with separate service pages; Profile replaces More. Website-only tools open an explanation popup with an explicit browser action. Deploy the new API route before testing private submission attachments, install mobile dependencies and restart Expo Go. No new environment variables or database migration. Physical file picking/sharing acceptance remains pending.


## Navigation and glass update — 17 October 2026

Run `npm --prefix apps/mobile ci`, then restart Metro with `npm --prefix apps/mobile start -- --clear` and reload the app. This mobile-only change needs no Render deployment, environment changes or data migration. Use a compatible SDK 57 Expo Go for the bundled Expo modules; rebuild a custom development client after adding native dependencies. Android/iOS JS bundle export does not produce a signed installable app.

The top bar shows Schoolglass Desk on login, the school on Home, and the current service title elsewhere, with Sign out after login. Services contains role-specific website sidebar sections and separate action screens. Profile contains user details, appearance/password controls and school access. Multi-school directors choose a school before workspace data loads; use Profile → Switch school to choose again.

`expo-glass-effect`, `expo-blur` and `expo-linear-gradient` provide native material where supported and readable fallbacks elsewhere. iOS Liquid Glass availability is checked at runtime; Reduce Transparency uses an opaque surface. Older Android uses a tinted fallback. Live effects are limited to navigation bars. Verify the actual material and transitions on both phones before wider distribution.


### Icon and loading feedback refresh

The latest mobile update adds original local SVG icons (`react-native-svg`), stronger screen entry motion, orbit loaders and a successful-save checkmark. Install mobile dependencies and restart Metro with the commands above. A custom development client must be rebuilt for added native modules. Reduced Motion keeps clear static progress feedback. No API deployment, new environment variable or school data change is required.


### Account security and phase tracking

Active sessions is available from Profile and Services → Security. It uses existing /auth/sessions and /auth/revoke-others endpoints. Confirming ends other sign-ins for the same account across schools, keeping the current sign-in; refresh manually after a connection interruption before retrying. No backend redeploy or environment change is required. Current phase status: [MOBILE-PLAN.md](../../docs/MOBILE-PLAN.md). Signed build and physical-device gates: [MOBILE-PILOT-CHECKLIST.md](../../docs/MOBILE-PILOT-CHECKLIST.md).


### M4.2 — Dates and class attendance

Install dependencies and restart Metro after this update. Native dates now use @react-native-community/datetimepicker (SDK 57-compatible); custom development binaries need rebuilding. Compatible Expo Go includes the native picker. Web preview uses the browser date control.

Attendance defaults to the device's local today. Choose the class/session, mark remaining students present, adjust exceptions and review/confirm once for the class. Existing saved entries are locked and require corrections. Refresh school records after saving or after an interrupted response. No backend redeploy or migration required.

The 17 October dependency audit now reports 22 findings (19 high, 3 moderate); the added picker has an indirect advisory path via Expo. This extends the previously documented upstream audit gate and is not a clean audit claim. Resolve/review compatibility before wider distribution; do not apply forced major-version upgrades.
