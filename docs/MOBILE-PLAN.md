# Mobile development plan — Schoolglass Desk

Planned 15 October 2026. This is an implementation plan, not a shipped mobile app. Existing website/data remain intact. Android-first is the recommended initial target; maintain iOS-compatible source.

## Feasibility and stack

Build React Native with Expo and TypeScript in apps/mobile, alongside apps/web and apps/api. Native screens reuse the existing Node.js API and MySQL/R2 storage. React web components/CSS cannot simply be copied to native; share contracts, validators and domain logic where useful. No replacement database or second backend.

Repository review confirms bearer-token sessions, expiry/revocation and school/class permissions already exist. Review response contracts and capability checks before each native workflow; UI visibility is not authorization. Use the existing custom-domain /api base URL for explicit pilot acceptance, and isolated demo/local API for ordinary development/tests.

This Windows workspace has Node/npm, Java and adb available. The emulator command is not on PATH. Android SDK versions, licenses, emulator/device availability and a full native build have not been verified. Local iOS simulator/build requires macOS/Xcode; source can be developed here and compatible early screens previewed on an iPhone with Expo Go. A signed iOS build/distribution needs the appropriate Apple provisioning route.

## Milestones and acceptance

| Milestone                     | Deliverable                                                                                                                                                | Required acceptance                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| M1 Foundation                 | Expo workspace, navigation, API client, session restore/login/logout, mandatory password change, school switch, school identity, system-default light/dark | Typecheck/unit checks; clean startup; revoked session handling; explicit school-context clearing                      |
| M2 Student/guardian daily use | Dashboard, child switch, notices/read status, calendar, timetable, attendance summary, published results, homework/resources, fees/receipts, gallery       | No cross-child/class/school leakage; authenticated file open/download; readable loading/error/empty states            |
| M3 Teacher workflows          | Assigned classes, attendance, marks, homework, notices, timetable                                                                                          | Backend permission enforcement; validation; no silent duplicate writes or blind retries                               |
| M4 Leadership                 | School overview, people/admission lookup, notice publication, review/approval queues, staff/fee summaries                                                  | Correct role capabilities and safe confirmation/reason workflows; retain complex Excel/bulk planning on web initially |
| M5 Release pilot              | Signed Android preview APK, device/accessibility checks, setup/build/update guide                                                                          | Physical-device checks, background/resume, expired sessions, slow service, no secrets in bundle; owner-approved pilot |
| M6 Later extensions           | Remaining management parity, optional push, carefully designed offline workflows, iOS release                                                              | Separate acceptance for each feature; no claim of full web parity before verified                                     |

Prioritize students, guardians and teachers for mobile daily tasks. Keep platform-owner onboarding/support and complex spreadsheet administration on web initially; decide native owner tooling later. This stages delivery without changing the long-term shared-platform objective.

## Design

Use native navigation with role-relevant bottom tabs and a More screen. Compact cards, accessible touch targets, readable typography, reduced-motion support and controlled glass effects. Match school logo/name and existing fixed palette; system appearance initially, explicit light/dark override. Respect safe areas, keyboard, back button and screen-reader labels. Clear selected school/child identity on all relevant screens.

## Authentication and API safety

- Save session token using Expo SecureStore on supported native platforms, never plaintext AsyncStorage or logs. Do not save passwords. No MySQL/R2 credentials in the mobile bundle.
- Restore through server validation; handle expiry/revocation/archival with sign-in routing. Logout invalidates server session and clears local secrets and private caches.
- Reuse first-login password change. Reset remains subject to the existing backend delivery configuration; mobile UI cannot enable disabled SMTP.
- Scope query/cache keys by account, school and child; clear scoped data on switch/logout. Ignore stale requests from a previously selected school.
- Use bounded timeouts, cancelable requests and clear cold-start messaging. Do not retry writes automatically unless the endpoint has proven idempotency support.
- Download private files with authenticated requests and controlled temporary storage. Do not convert private bucket objects into public links.
- Verify native traffic through Cloudflare: browser challenge pages are not valid API JSON. Use narrowly reviewed edge configuration if necessary, not global security bypass or unrestricted proxy trust.
- Verify API response/version behavior against a release contract. A mobile binary may outlive multiple backend releases; preserve backward compatibility.

## Offline and notifications

Initial app is online-first with connection errors/retry controls, no offline attendance/mark writes. Offline synchronization requires record versions, conflict handling and explicit user review before implementation. Do not cache sensitive school records persistently by default.

Initial notifications use existing in-app inbox. Background push is a later development-build feature needing token registration/removal, per-user school authorization and device testing. Keep sensitive student details out of lock-screen payloads. No new paid SMS/email service is assumed.

## Free development and distribution

Expo Go can preview supported early features; use a development build for native integration and release-like testing. EAS offers a limited Free build allowance, not unlimited builds; verify the account's current quota. Avoid paid subscriptions and repeated cloud builds. Local Android compilation is an option after SDK/licenses are verified. Building an APK is distinct from store publication and public distribution requirements.

Google Play developer registration currently costs US$25 once; Apple Developer Program is US$99/year where applicable. Store publication is outside the zero-investment milestone. Start with development/testing on your own phone; review applicable signing, Android verification/distribution and platform requirements before wider APK sharing. No paid account or build submission will be created automatically.

The mobile app does not need its own hosting subscription. API calls/file downloads still count toward existing Render/Aiven/R2 limits. No keep-awake pings, live load testing or duplicate production services.

## What can be done here / owner involvement

Agent: implement native source, shared contracts, isolated API regressions, typechecking, JS build checks, Android tooling diagnosis, documentation and preparation of a signed preview build when tooling/signing is ready.

Owner: confirm Android or iPhone for first device testing; install Expo Go for an early preview where supported; provide device interaction feedback. An Expo account is needed only if choosing EAS services. Keep signing credentials private. Store accounts, distribution and publishing are separate explicit decisions.

No new credentials are required for planning. For M1 implementation, default to Android-first; no need to wait for an account to build source or isolated tests. Do not claim a native build/device acceptance until actually run.

## Tracking

- [x] Existing API and repository feasibility review.
- [x] Initial native stack and staged delivery plan.
- [ ] Verify Node/Expo SDK compatibility and workspace dependency layout before scaffold.
- [ ] Verify Android SDK/licenses/device; do not infer readiness from adb alone.
- [ ] Implement M1 and provide reproducible device instructions.
- [ ] Complete subsequent milestone acceptance individually.

## Official references checked for planning

- https://docs.expo.dev/get-started/set-up-your-environment/
- https://docs.expo.dev/develop/development-builds/introduction/
- https://docs.expo.dev/workflow/overview/
- https://docs.expo.dev/billing/plans/
- https://docs.expo.dev/versions/latest/sdk/securestore/
- https://support.google.com/googleplay/android-developer/answer/6112435
- https://developer.apple.com/help/account/membership/program-enrollment/

## M1 implementation — 15 October 2026

Implemented the Expo SDK 57 / React Native foundation in apps/mobile with its own lockfile, excluded from root npm workspaces so Render does not install native dependencies. Includes Router-protected account navigation, bearer login, endpoint-scoped native SecureStore token storage, validated restore, required password change, reset requests, school switching/identity, small scoped overview and system-default light/dark with session override. Private school data stays in memory and is cleared across switching/logout; generation guards reject stale responses.

Validated: TypeScript, lint, isolated API/session tests, SDK Doctor 21/21 and Android/iOS/web JS exports. Mobile-sized web checks cover login/logout, school switching, password-change gate, accessibility and overflow in both themes. Native phone SecureStore, gestures/keyboard and signed builds remain pending. Android API 36/build tools and Java 17 exist; adb startup could not be verified in the sandbox. No native binary, cloud build, paid account, live API data mutation or mobile workflow parity is claimed. Remaining upstream dependency findings are documented in apps/mobile/README.md as distribution gates. See that README for phone setup.
