# Mobile development plan — Schoolglass Desk

Started 15 October 2026; status reviewed 22 October 2026. Native source and Expo previews are implemented; no signed production mobile release has shipped. Existing website/data remain intact. Android-first is the recommended initial target; maintain iOS-compatible source.

## Current phases and next steps

This table is the current source of truth; dated implementation notes below are history. “Implemented” means source and automated checks, not completed physical-device acceptance. Detailed coverage: [MOBILE-WORKFLOWS.md](MOBILE-WORKFLOWS.md). Device/release checklist: [MOBILE-PILOT-CHECKLIST.md](MOBILE-PILOT-CHECKLIST.md).

| Phase | Scope | Current status | Exit criteria / next action |
| --- | --- | --- | --- |
| M1 Foundation | Session, secure token storage, school identity/selection, password gate, shared API | Implemented; basic Expo sign-in confirmed by owner | Complete full background/expiry/keychain checks on phones |
| M2 Student and guardian | Daily reads, homework answers/attachments, private documents, child isolation | Implemented and automated checks pass | Physical file picker/sharing, school/child switching and accessibility acceptance |
| M3 Teacher | Attendance/corrections, configured marks, learning/homework, notices and leave | Implemented and automated checks pass | Teacher phone walkthrough against dummy data |
| M4 Leadership and mobile usability | Selected operational/approval/fees services; sidebar Services pages, Profile, glass/icons/motion | Implemented; complex desk work explicitly opens website guidance | Leadership phone walkthrough; retain imports/setup on web |
| M4.1 Account security | Active sign-ins, confirmed sign-out of other sessions, account-scoped client guards | Implemented 17 October 2026 | Automated checks passed; owner two-device check pending |
| M4.2 Daily task efficiency | Simplified dashboard, selectable dates, class-wide attendance review/save | Implemented 17 October 2026 | Automated batch checks; native calendar/roster phone walkthrough pending |
| M4.3 Ambient motion and navigation | Branded glass top bar, selected-tab capsules, compact responsive login, focused ambient flow/orbits | Implemented 17 October 2026 | Browser fit/motion checks and physical keyboard/frame-rate acceptance |
| M4.4 Glass and motion refinement | Drifting mint/violet aurora, faster orbit flow, settling zoom, navigation glass highlights | Implemented 17 October 2026 | Contrast/motion regressions and physical-device performance acceptance |
| M4.5 Calendar, reports and tab ownership | Month calendar/details/legend, report tables/PDF actions, School day hub, swipe tabs and draggable glass indicator | Implemented 17 October 2026; validation recorded in WORKLOG.md | Native swipe/material/share-sheet acceptance on both phones |
| M4.6 Navigation and compact records | Floating content blur, simpler swipe/tab motion, marks register, aligned timetable, login glow/theme control | Implemented 18 October 2026; validation in WORKLOG.md | Physical iOS/Android motion and blur acceptance |
| M4.7 Directional tab slides | Paired outgoing/incoming full-width slides in a shared tab navigator; preserved URLs and guards | Implemented 18 October 2026; checks in WORKLOG.md | Native transition feel and back gestures |
| M5.1 Pilot preparation | Reproducible build setup, dependency review, signing and device matrix | APK tooling/icons, project link, allowance and 70-file mobile-only archive verified; owner approved upload, Expo signing configured, repaired-lockfile build running 22 October | Resolve/review upstream audit gates, verify SDK/licenses and private signing setup |
| M5.2 Device pilot | Signed Android preview, iOS preview route, lifecycle/slow-network/accessibility checks | Pending | Record actual device results and fix failures; owner accepts pilot |
| M6 Optional extensions | Push, carefully scoped offline reads/sync, additional mobile management | Planned, not enabled | Define feature contracts and cost/privacy constraints individually; no offline writes or push without separate acceptance |

Next development priority after M4.7 is M5.1/M5.2, not expanding into unverified push/offline features. No paid build/store subscription, production data mutation or public mobile distribution is part of the current work. Existing website phases are separate and remain documented in the web plan.

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

Use native navigation with Home, School day, Services and Profile tabs. Compact cards, accessible touch targets, readable typography, reduced-motion support and controlled glass effects. Match school logo/name and existing fixed palette; system appearance initially, explicit light/dark override. Respect safe areas, keyboard, back button and screen-reader labels. Clear selected school/child identity on all relevant screens.

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

Owner: confirm Android or iPhone for first device testing; install Expo Go for an early preview where supported; provide device interaction feedback. A free Expo account is also required for Expo Go on a physical iPhone: sign in to the same account in Expo CLI and Expo Go. EAS services separately require an Expo account. Keep signing credentials private. Store accounts, distribution and publishing are separate explicit decisions.

No new credentials are required for planning. For M1 implementation, default to Android-first; no need to wait for an account to build source or isolated tests. Do not claim a native build/device acceptance until actually run.

## Tracking

- [x] Existing API and repository feasibility review.
- [x] Initial native stack and staged delivery plan.
- [x] Verify SDK 57 dependency compatibility and isolated mobile workspace layout.
- [ ] Verify Android SDK/licenses/device; do not infer readiness from adb alone.
- [x] Implement M1 and provide reproducible Expo preview instructions.
- [x] Implement M2–M4 daily workflows, navigation and visual refinements.
- [x] Implement M4.1 account session security.
- [ ] Complete physical-device acceptance and M5 signed pilot release gates.

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

## M2 implementation — student/guardian daily reads

Implemented the eight daily sections, guardian child switching and record refresh, explicit eligible notice receipts, homework/resource and feedback reads, dated holiday/substitution-aware timetable, calendar, recorded attendance, current published results, fee balances/payment receipts and paginated private gallery. Added authenticated native document sharing with scoped temporary cache cleanup; no offline writes or homework submission in this milestone. Added only compatible guardian API reads/payment payload and fixed guardian resources to use configured R2/local storage. Existing school records are unchanged. See MOBILE-DAILY-VIEWS.md for deployment, validation and remaining native-phone acceptance.

## M3 / leadership daily expansion — 17 October 2026

Teacher daily workflows and selected leadership operational flows are now implemented, alongside student homework submission and shared school services. This supersedes the earlier M2 read-only homework note. Three style previews were evaluated; Glass is now the only selected style. See MOBILE-WORKFLOWS.md for the feature matrix, deliberately web-based desk work, validation and remaining physical-device/release acceptance; no blanket native management parity is claimed.

## Selected Glass layout

The owner selected Glass. The temporary three-style chooser is retired. The app now has a compact school dashboard, feature search, four quick actions, a feature grid and fixed bottom navigation. Services retains role-relevant website-only features with an accessible explanatory popup. Screen transitions honor reduced motion; see MOBILE-WORKFLOWS.md for the current behavior and device acceptance.


### 17 October 2026 — mobile navigation and glass refinement

Implemented a global school/service title bar with Sign out, a complete role-specific sidebar catalogue under Services, separate section/action routes, Profile instead of More, and explicit multi-school director selection before workspace reads. Added native Liquid Glass capability checks, bounded navigation blur, colour washes, opaque screen backing and accessibility fallbacks. Web UI and live school data remain unchanged. See MOBILE-WORKFLOWS.md for coverage and device acceptance; this is a mobile preview refinement, not a signed store release.
