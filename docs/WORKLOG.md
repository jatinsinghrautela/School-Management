# Work log

## Staff profiles and leave milestone (2026-10-09)

- Added Staff navigation for school leaders, teachers and supporting staff. Leadership manages school-scoped employment profiles; employees see only their own profile and leave history. Students have no access, and support sessions are read-only.
- Added reasoned leave requests, independent approval/rejection, own pending cancellation and leadership cancellation of another employee's approved leave. Request retries are idempotent; school transactions prevent overlapping requests and competing decisions. Decisions and profile edits retain transactional audit history.
- Added contained, padded cards with responsive profile fields, status/search filters and 15-request pagination. Leave does not change attendance, timetable assignments or payroll automatically.
- Added MySQL migration 7 with typed employment/leave fields, references, uniqueness and date/status/type constraints. Disposable database fixtures passed; existing records remain preserved.
- Validation: all 40 API tests and the production build passed. Browser automation still fails during initialization (missing kernel-assets path); interactive UI acceptance is explicitly unverified.
- Updated PLAN, README and STAFF-LEAVE.md. No paid services or new dependencies. Library catalog/lending is the next planned Phase 3 milestone.

## 2026-10-09 — fees and manual receipts

- Added the Fees tab for management and students, immutable class/year schedules, reviewed student assignment, fixed concessions and outstanding balances grouped by currency.
- Added ledger search and 20-row display pages with consistently padded forms and wrapping controls.
- Implemented integer minor-unit accounting, school-locked consistent reads/writes, request-key retry protection, duplicate assignment guards and concurrent overpayment prevention.
- Added manually recorded cash/bank/cheque payments, snapshot-based printable HTML receipts, escaped text and reasoned void corrections that retain original entries. No funds are transferred and no external payment service is connected.
- Added MySQL migration version 6 with typed tables, scoped financial references, student/schedule and request/receipt uniqueness, and amount constraints. Disposable MySQL verification passed.
- Validation: 39 API tests and production build passed; focused checks passed after final consistent-read and receipt-escaping changes. Browser automation still fails to initialize, so interactive visual/print verification remains unverified.
- Updated PLAN and added FEES.md. SMTP/scanning safe disabled states remain unchanged. Staff profiles and leave workflow are the next planned milestone.

## 2026-10-09 — student-record spacing correction

- Added a padded body with consistent vertical gaps to Admissions and student records. Aligned student labels/profile details, spaced wrapping action buttons, and corrected nested form/fieldset and checkbox layouts.
- Added narrow-screen stacked profile details and smaller card insets. Styles are scoped to the student-record card, preserving other layouts.
- Production build verified. Browser automation remains unavailable due to initialization failure, so interactive visual verification could not be performed.

## 2026-10-09 — admissions and student records

- Implemented submitted/reviewing/admitted/rejected/withdrawn admission workflow with reasoned audit history, school/class scope checks, duplicate email protection and terminal decision guards.
- Admission atomically creates the student account, profile, guardian links and enrollment history; undisclosed random credentials require activation through existing recovery. Concurrent admits create only one user; profile conflicts roll back every write.
- Added management-editable profiles and up to three authorized guardian contacts, student own-record visibility, historical guardian link retention and support-session write restrictions. Teachers/staff cannot read these private records. Parent login remains a later milestone.
- Added People student-record/admission controls, enrollment history, multiple guardian editing and consistent panel spacing. SMTP/scanner remain safely unconfigured.
- MySQL version 5 migration and disposable relational checks passed after restarting the existing localhost Docker MySQL container without replacing its volume. API suite and web build passed; browser automation failed to initialize, so interactive UI acceptance remains unverified.
- Added ADMISSIONS.md and updated Phase 3 plan. Development preview uses synthetic demo data; the ignored environment file was not changed.

## 2026-10-08 — initial web foundation

- Reviewed product scope; recorded roles, missing academic/operations modules, security requirements and web-first/mobile-later sequence.
- Created React/Vite and Express/MySQL npm workspace, local database Compose setup and optional ephemeral demo mode.
- Built Orbit visual design: responsive light workspace, orbital hero animation, role navigation, school switcher, forms and tables.
- Implemented organization/school onboarding, user/class creation, attendance, marks, printable results, resource links, notices and basic KPIs.
- Added server-side school/class scope enforcement and authorization regression tests.
- Documented unfinished production requirements including email reset delivery, real uploads, normalized schema and persistent sessions.
- GitHub remote was not present in the selected empty folder at inspection; do not claim changes have been pushed.

### Verification and additions

- Production React build passed.
- Eleven HTTP integration tests passed: tenancy, class access, mutations, notices, sessions, single-use reset, recovery hierarchy, file validation, authorized downloads and complete organization/school/principal/student onboarding.
- MySQL 8.4 initialized successfully; verified an audit record persisted across independent connections.
- Dependency audit reports zero known vulnerabilities after overriding shell-quote to patched 1.12.0.
- Browser verified director school switching, individual attendance/marks, teacher editable registers, calculated results, responsive layout and mobile navigation.
- Added local PDF/image uploads and protected downloads, administrator-assisted recovery, provisional result summaries, serving the React build through Node, and GitHub CI.
- Corrected focus styling and accessible form labels during browser verification; hidden mobile navigation is inert.
- Connected origin to `https://github.com/jatinsinghrautela/School-Management.git`; initial commit `bd4ec16` successfully pushed to main.
- Local secrets, uploaded files, node_modules and generated builds are ignored and excluded from Git.
- Added readable code formatting, an npm format command, and a saved dashboard screenshot. Final local test suite: 11 passed; production build passed; no known npm advisories.

## 2026-10-08 — Academic setup and published results

- Added academic years/current-year selection, grade/section classes, subjects and editable teacher assignments.
- Added exam schedules with editable maximum marks, weights, pass thresholds and grade bands.
- Attendance and exam registers now save atomically, with school transaction locks, stable IDs and transactional audit entries.
- Added complete-roster publication, immutable report versions, reasoned reopening and management-only archive history. Student access is restricted to own published results.
- Added responsive report cards and browser print layout; historical unconfigured marks remain available to staff.
- All 16 HTTP integration tests passed. MySQL rollback and three concurrent school transactions passed using disposable fixtures that were removed afterward.
- Browser verified setup dates, publication, correction and archive history. A 3:1 weighting produced 62.5%; correction produced a new 92.5% version while preserving the earlier result.
- Student visibility and 390px mobile report layout were checked; no page overflow. Saved `screenshots/report-card.png`.
- No paid integration or new dependency introduced. Dedicated PDF export, normalized migrations, terms/year rollover and persistent sessions remain open.

## 2026-10-08 — Glass design, independent schools and support mode

- Replaced displayed branding with the AI-coined working name NuvyraSchola, original SVG glyphs/favicon and original CSS decoration; removed external fonts and Lucide. Documented asset provenance and the limits of name-clearance claims.
- Added a seafoam/deep-green glass palette, translucent cards, limited navigation blur, subtle transform/opacity transitions and reduced-motion/mobile fallbacks.
- Organization assignment is optional. Independent accounts are constrained to one school and authorization still requires explicit membership.
- Added owner support sessions for existing school accounts, a required issue reason/live-data acknowledgment, 30-minute expiry, parent-session revocation, visible return control and owner-attributed audit events. Support mode blocks account-security mutations.
- All 17 integration tests passed, including independent-school isolation, support role restrictions, mutation attribution and parent logout revocation. Production build passed; no known dependency advisories after removing Lucide.
- Browser confirmed entry into the teacher workspace via support mode and its visible support banner. Further visual verification screenshots accompany this milestone.
- Final browser checks confirmed independent-school creation, support entry and return to the owner. The 390px overview had no horizontal page overflow. Saved glass-dashboard and support-session screenshots. JavaScript build output is 283.55 kB (85.26 kB gzip); this is a bundle check, not a low-end-device performance benchmark.

## 2026-10-08 — English title, transparent glass and account status

- Replaced the working title with Schoolglass Desk, configurable in `apps/web/src/brand.js`, and updated the original mark to a window motif. Naming remains a working choice rather than a claim of legal exclusivity.
- Reduced card opacity to visibly reveal background colors. Added modern styled native picker menus where supported, with keyboard/form-validation behavior retained and a rounded fallback elsewhere.
- Implemented audited account suspension/reactivation. Suspension revokes account sessions and reset tokens and blocks login/recovery/support entry. Management permissions retain school and leadership boundaries; owner/self suspension is blocked.
- All 17 integration tests passed with expanded account-status checks. Browser verified the styled dropdown, suspension/reactivation and 390px page width without overflow. Saved `screenshots/schoolglass-dashboard.png`.
- No paid services or dependencies added. Remaining account profile editing, invitation flows, durable sessions and other modules are still tracked separately.

## 2026-10-08 — Readability, reliable dialogs and profile editing

- Corrected overly transparent text surfaces and darkened secondary text. Kept decorative glass in navigation and background treatment; forms/report dialogs use stable opaque surfaces.
- Removed the content entrance transform that affected fixed-position academic popups. Added a shared dialog scroll lock, focus trap, focus restoration and Escape handling. Backdrops are consistently dimmed without blur; only dialog content scrolls.
- Added slow transform/opacity motion to decorative rings, stars, brand mark and small indicators. Reduced-motion preferences disable these; no text, table or popup moves continuously.
- Added management-authorized name/contact profile editing, transactional audit entries and field whitelisting. Login email, roles and memberships cannot be injected; school/leadership boundaries and support restrictions remain enforced.
- All 17 integration tests passed, including expanded profile validation and cross-school/privilege checks. Production build passed.
- Browser verified profile save, Tab cycling to the close control, background overflow hidden while open and restored afterward, an unblurred overlay, opaque form background and viewport-wide academic backdrop. A 390px academic dialog stayed within viewport bounds with internal scrolling; Escape restored the workspace.
- Saved `screenshots/readable-dialog.png` and refreshed the dashboard preview. Profile permissions/invitation flows and durable sessions remain tracked separately; no paid service added.

## 2026-10-08 — Weekly timetable

- Added year-linked recurring weekly periods and responsive daily schedule cards. Management can add, edit and cancel periods; readers remain class-scoped.
- Added school-transaction checks for class, teacher and room overlaps, valid time ranges and active subject-teacher assignments. Concurrent conflicting saves produce one success and one conflict; adjacent periods are valid.
- Teacher names are projected into authorized schedule records without exposing account contact details to students. Cancelled periods stay stored for history and are excluded from workspace views.
- All 18 integration tests and production build passed. Browser verification is recorded below. No dependency or paid service added.
- Date-specific substitutions, holidays, cross-school conflict coordination and publication approval are separate remaining work.
- Browser verified period creation with an assigned teacher and room, and a 390px timetable without horizontal overflow. Saved `screenshots/timetable.png`. Tests also explicitly cover cross-class teacher conflicts and case-insensitive room conflicts.

## 2026-10-08 — Homework submissions and teacher feedback

- Added text answers with preserved versions, own-submission visibility, teacher feedback history and revision requests. Reviewed work requires a teacher revision request before a new answer.
- Added transactional submission/review audit records, latest-version review enforcement, school/class permissions and validated due dates. Lateness uses the displayed end-of-day UTC policy; late answers are accepted.
- Restricted the timetable router guard to its own route prefix so downstream student/teacher routes work correctly.
- All 19 integration tests and the production build passed. Tests cover spoofed student fields, peer-answer privacy, cross-school/class access, late status, feedback history and revision gating.
- Browser verification covers student submission and teacher review; screenshots accompany this milestone. Text answers only: private student attachments, school timezone configuration, rubrics and reminders remain tracked work. No new dependency or paid integration added.
- Browser verified a student answer and teacher revision request with visible feedback history. The 390px dialog had no page overflow and background scrolling remained locked. Saved `screenshots/homework-feedback.png`.

## 2026-10-08 — Sidebar account visibility

- Reserved a non-shrinking sidebar footer for the signed-in user and logout. Navigation scrolls independently instead of pushing account controls below the window.
- Reduced decoration/header spacing for short windows and preserved full-size navigation buttons. Mobile drawers use the same viewport-height layout.
- Browser verified at 1280×600: profile remained within the viewport, while navigation scrolled (272px viewport / 402px content). Saved `screenshots/sidebar-short-window.png`. Production build passed.

## Account-access milestone (2026-10-08)

- Completed durable hashed session/recovery storage, mandatory temporary-password replacement, authenticated password changes, session listing and sign-out of other sessions.
- Added authorized role and school/class editing; authentication generations invalidate access after password, membership and status changes. Teaching dependencies and student academic history prevent unsafe reassignment.
- Added integration coverage for restart behavior, onboarding gates, permission limits, revocation and concurrent single-use recovery. Real MySQL security verification passed with disposable fixture cleanup.
- Phase 2 remains in progress: normalized SQL, enrollment rollover, calendar, imports/exports and email delivery remain separate work. No paid service or dependency added.
- Validation: 20 integration tests passed; production build passed; browser checks confirmed Security controls and the account access dialog. MySQL restart/revocation checks passed.

## School calendar milestone (2026-10-08)

- Added school calendar navigation, a monthly grid and agenda, all-day multi-day events, school-wide holidays and class/role targeting.
- Added management editing and cancellation with a retained reason and transactional audit writes. Students/teachers receive only entries allowed by their class and role; school access remains enforced by the API.
- 21 integration tests passed, including impossible dates, reversed ranges, unauthorized writes, cross-school/class access, audience filtering, editing and cancellation history. Production build passed.
- Calendar holidays do not yet change attendance or timetable rules. Substitutions, session attendance and the remaining Phase 2 items are still open. No paid services or dependencies added.
- Browser validation: created and edited a demo event, confirmed its October 15–16 range in the grid and agenda, and corrected a shared empty-state CSS rule that expanded leading blank days.

## Development blank-screen fix (2026-10-08)

- Diagnosed an empty cached Vite entry module after a file write; the saved source and production bundle remained intact.
- Invalidated the stale module and configured the development watcher to wait for writes to settle before reloading.
- Browser verified login rendering after recovery; production build passed.

## Yearly calendar Excel milestone (2026-10-08)

- Added default Sunday holidays and all/second-and-fourth/second-only/fourth-only/no Saturday options before template download on Timetable.
- Added formatted full-year .xlsx workbooks, management-only upload validation and review previews; application is atomic, audited, school-scoped and repeatable, preserving manual calendar entries.
- Added leap-year, weekend occurrence, workbook round-trip, wrong-school, missing/duplicate-date, formula, stale/expired preview and concurrent application coverage. All 24 tests passed; production build passed.
- ExcelJS is a free backend runtime dependency, with a patched UUID override; npm audit reports zero known vulnerabilities. Holidays still do not change attendance or weekly class periods.
- Browser verification completed: template download with 2nd/4th Saturdays and Sundays off, full 365-date upload preview and successful application of 76 synthetic holidays. Workbook layout rendered and checked with the bundled spreadsheet tool.

## Calendar location and public holidays (2026-10-08)

- Moved yearly Excel planning from Timetable to Calendar.
- Added Include/Exclude public-holiday preference and country/state/region selection, offline holiday generation and retained reference names when days off are excluded.
- Added verified India 2026 central gazetted dates after identifying gaps in the bundled dataset, with source/license attribution in Settings and the interface. Other-year/regional coverage limits are documented and shown to administrators.
- Kept legacy workbook imports compatible; added location validation, regional rules, substitute dates and include/exclude tests. 26 tests and production build passed; dependency audit reports zero known vulnerabilities.
- Browser verified the relocated Calendar tools, Karnataka selection, Include/Exclude dropdown and successful template download; saved `docs/screenshots/calendar-public-holidays.png`.

## Holiday-aware attendance milestone (2026-10-08)

- Connected active school-wide Calendar holidays to both attendance endpoints with school-locked transactional checks. Includes imported dates and inclusive multi-day closures; cancelled, other-school and ordinary event entries stay open.
- Added holiday notices and disabled saves in the register and single-record dialog. Historical rows are retained and labelled; dashboard percentages exclude records on active holidays and restore eligibility when closures are cancelled or edited.
- Added regression coverage for both write paths, date boundaries, atomic rejection without audit/record writes, role/tenant scope, imported closures and cancellation. All 27 tests and production build passed. The initial sandbox test run lacked localhost access; the authorized rerun passed.
- Browser verified both forms on a synthetic demo closure and re-enabled controls on a school day. Saved `docs/screenshots/attendance-calendar-rules.png`; behavior and remaining attendance work are described in ATTENDANCE.md.

## Attendance correction approvals (2026-10-08)

- Added reasoned requests and independent leadership approval/rejection. Both direct attendance write paths now reject changes to saved statuses; unchanged saves stay idempotent and batch failures roll back atomically.
- Added one-pending-request guards, role/class/school visibility, self-review prevention, stale-record and holiday checks, retained request/review history and transactional audit records.
- Added the correction form, leadership review controls and pending/all/approved/rejected filters. Existing register statuses are read-only, and Mark all present only fills unrecorded students.
- Updated authorization/holiday regressions and added correction tests for bypass attempts, injected fields, concurrent reviews, stale records, closure conflicts and historical visibility. All 28 tests and production build passed.
- Browser verified teacher submission, unchanged attendance while pending, independent principal approval, updated register/dashboard and retained review history. Saved `docs/screenshots/attendance-correction-approval.png`; final form styling and disabled no-op register actions were also checked.

## Attendance card spacing fix (2026-10-08)

- Added 24px above the corrections card so it no longer touches the attendance history card. Browser measured the gap and saved `docs/screenshots/attendance-card-spacing.png`; production build passed.

## Complete Phase 2 implementation (2026-10-08)

- Added versioned relational migration, typed core tables, membership junctions, unique registers, mark/date checks and school-scoped foreign keys. Legacy records remain a backup. Indexed auth reads and READ COMMITTED transactions preserve concurrent credential generations during reviewed promotion.
- Added terms, initial enrollment history, single-use roster previews/promotions, Daily plus configurable attendance sessions, and preservation of own approved historical report access after promotion.
- Added snapshot-based PDF downloads, school report heading/accent/typed sign-offs, repeated headers and page footers. Generated and visually reviewed a synthetic 32-subject three-page PDF; no real school data used.
- Added dated holiday-aware timetable and audited substitute assignment/cancellation with teacher conflict checks and private reason filtering.
- Added private homework attachments, local fail-closed ClamAV adapter, upload quotas, bound-submission downloads and periodic staged/orphan/token/preview cleanup. User requested configuration and safe disabled states; real scanning remains unconfigured and file inputs are disabled.
- Added reasoned login-email edits, recovery token generation guards, configurable TLS SMTP invitations/reset delivery, delivery-failure revocation/audits and recovery issuance limits. Tests used a fixture mailer; no external email was sent. Real SMTP remains unconfigured.
- Added role-scoped directory search/pagination, shared 20-row tables, reviewed Excel people import with row errors/single-use apply and permission-scoped attendance/directory/results exports. Imported users require private activation and do not share a default password.
- Validation: 37 tests passed, production build passed, MySQL transaction/security/relational checks passed, including duplicate-email non-overwrite, cross-school references and rereading a concurrent user generation after row locking. Browser confirmed academic controls, session creation and saved Morning attendance, resource upload disabled state, card spacing and no console errors. Evidence: phase-two-academics.png, phase-two-attendance.png and phase-two-preview.png.
- Updated PLAN, architecture, cost policy, attendance guide, README and PHASE-2 setup/operations documentation. Phase 4 production readiness remains separate.

## Complete Phase 3 baseline (2026-10-09)

- Completed library, transport, assets/custody, ticket workflows, visitor logs and reviewed printable document requests with scoped permissions, retained history, stale-version guards and retry-safe writes.
- Added verified guardian account onboarding, explicit revocable child links, parent switching and own-child attendance/results/fees/resources/timetable/notices/calendar. Unchanged guardian contacts survive profile edits; changed contacts require fresh verification.
- Added in-app notifications/read receipts and current class-authorized private teacher/guardian messaging. Link revocation removes subsequent access; leadership cannot inspect private messages. Audited owner support sessions remain read-only.
- Added display branding/generated monograms, school accent, locale/timezone and English/Hindi family labels. No new external assets or paid dependencies.
- Added additive MySQL migration v8 with thirteen typed tables and a disposable-fixture operations verification script. Existing admissions, fees and leave remain integrated.
- Validation: 42 API tests passed; focused operations tests passed after final owner roster filtering; MySQL relational and operations checks passed. Browser exercised catalog/lending, route assignment and settings; desktop card gaps measured 24px, mobile had no horizontal overflow and sidebar sign-out remained accessible. Fixed native date submission and card/input/header spacing discovered during review.
- Updated PLAN, README and PHASE-3 operating guide. SMTP/ClamAV remain intentionally unconfigured. Phase 4 production readiness and mobile remain separate.

## Phase 3 publishing and usability improvements (2026-10-09)

- Added multi-class/section notice targeting with legacy single-class compatibility; teachers publish only to students in currently assigned classes and retain own-notice visibility. Added scoped branded notice downloads and parent child-target matching.
- Integrated verified guardian account creation/reuse and explicit links into atomic admission approval, with rollback for incompatible accounts. Student accounts were already automatic; activation remains a separate credential step. Added clear account creation summaries and inline verified-contact choices.
- Fixed View ledger feedback by scrolling and focusing the selected charge panel, with reduced-motion handling. Browser verified the ₹1,000 synthetic charge panel and payment/concession sections without recording a payment.
- Added scanned 256 × 256 PNG logos, 128 KB bounds, PNG pixel validation, school sidebar branding and immutable logo snapshots on reports/receipts/documents/notices. Branded workbook identity sheets preserve import layouts; resources download with a logo cover and preserved original pages/images, using server-only pinned pdf-lib.
- Added school-scoped gallery, leadership publish/archive, permission acknowledgment, metadata stripping, dimension/size/quota checks, private image reads, twelve-item pagination and lazy image loading. Uploads remain safely disabled until ClamAV is configured.
- Added additive MySQL migration v9 and gallery scoped-file/boolean checks. Validation: 46 tests and production build pass; MySQL operations checks pass. Browser reviewed multi-target and teacher publication, ledger focus, guardian review layout and upload disabled states. Synthetic two-page branded resource PDF rendered with Poppler and both pages visually checked.
- Updated PLAN, README, admission/asset guides and SCHOOL-PUBLISHING operating guide. No paid infrastructure added. Phase 4 remains required before real student data.

## 2026-10-10 — Phase 4 monitoring foundation

- Restarted the local web/API preview in demo mode; browser connection recovered after starting servers with loopback permissions.
- Added owner-only monitoring with full retained audit totals (fixing the previous 20-event counter), enabled accounts, independent schools, recent audited actions/actors and tracked upload storage.
- Added bounded minute buckets for completed API requests, client rejections, server failures, mean/maximum latency and process uptime. Counters store no request paths, identities, headers or payloads; health probes are excluded.
- Displayed explicit SMTP/scanner configuration states and ephemeral versus persistent storage. Configuration is not represented as successful infrastructure acceptance.
- Validation: 48 API tests pass, frontend production build passes. No database schema or paid services added. Production alerts, restore drills, privacy decisions and deployment acceptance remain unfinished Phase 4 items.

## 2026-10-10 — Encrypted backup and isolated recovery milestone

- Added offline repeatable-read MySQL snapshots of all 57 release tables plus tracked upload bytes, with exact table/engine checks and a 128 MB pilot limit. No plaintext backup files or secret arguments are written.
- Added built-in scrypt/AES-256-GCM encrypted bundles with authenticated headers, bounded decompression, row/file checksum and manifest verification; wrong keys and tampering fail closed.
- Added restore into new sg_restore_ databases/upload directories only, release-schema checks, parameterized inserts, explicit validation of 154 foreign-key constraints and mandatory session/reset revocation. Existing databases and live uploads are not overwritten or served.
- Added a disposable synthetic MySQL drill covering restored memberships, school isolation, files, audit history, token revocation, existing-target refusal and inconsistent-foreign-key rejection. Added a MySQL CI job for security, relational, operations and recovery checks; remote execution is not claimed from local validation.
- Validation: 50 API tests pass, production web build passes and local MySQL recovery drill passes. Added backup/recovery and incident-response guides, environment configuration, scripts and Phase 4 checklist updates. No paid service or new package dependency added.
- Actual-host recovery acceptance, school-controlled off-device storage/key custody, retention/privacy/export/deletion rules and deployment acceptance remain Phase 4 work. The demo application remains running.

## 2026-10-10 — Runtime permissions and school-isolation review

- Production API startup now skips schema creation/migrations regardless of the development auto-migrate flag and verifies current migration versions; db:init explicitly owns migration/bootstrap work. Failed schema initialization closes the pool.
- Enforced append-only audit records in direct/transactional stores, including caught demo transaction failures, and supplied reviewable table-specific runtime grants with SELECT/INSERT-only audit and read-only legacy/migration tables. No real account privileges were modified.
- Rechecked actor/target permissions inside account status/profile/access/recovery transactions, validated proposed assignments against the refreshed actor and made assisted token creation/audit atomic. Support sessions now require the initiating owner role to remain current. Raw API exception text is no longer logged.
- Added adversarial independent-school, guessed-ID, client-scope injection, cross-school notice and account-movement regression tests. Added a synthetic MySQL restricted-account drill and CI coverage.
- Validation: 54 API tests, production build, restricted-account MySQL drill, persistent authentication checks and recovery compatibility drill (57 tables/154 foreign keys) pass. Updated runtime-security operating guide, architecture, README, environment configuration and Phase 4 checklist. Independent penetration review and actual production privilege/audit retention acceptance remain open.

## 2026-10-10 — Deployment preflight and readiness milestone

- Added production configuration checks before store startup and an operator deploy:check command with optional read-only schema/connectivity checks. Invalid/demo/default-secret, public-bind, proxy, URL, partial SMTP and runtime recovery-secret settings are rejected without printing values.
- Added trusted loopback-proxy HTTPS enforcement for production application traffic, preserved CSP and disabled insecure-request upgrades only in development. API responses now prohibit caching.
- Added a separate database readiness endpoint with five-second caching, shared concurrent probes, a two-second deadline and bounded retries while a dependency remains pending. Failed probe connections are discarded; pool connect time and queue are bounded. Liveness remains separate and both probes are excluded from request KPIs.
- Added SIGINT/SIGTERM readiness draining, maintenance cancellation and connection/store shutdown with a ten-second failure deadline. Actual service-manager signal acceptance remains external work.
- Validation: 58 API tests and production build pass; development/read-only MySQL preflight passes, production preflight correctly rejects current development settings and live demo readiness reports ready. Updated deployment guide, configuration, README and Phase 4 checklist. Actual HTTPS deployment and remaining host/school release checks are still pending.

## 2026-10-10 — Isolated browser regression baseline

Added pinned free Playwright tooling, six Chromium checks against the built web app served by an isolated demo API on port 4100, and GitHub Actions browser execution. Checks cover script errors, desktop/mobile logout visibility, horizontal overflow, dialog keyboard focus wrapping/Escape/restoration/scroll locking, assigned school switching, teacher notice targeting, disabled uploads and student read-only actions. No live preview or MySQL data is changed.

Validation: production web build passed; all six browser tests passed. Dependency audit reported zero vulnerabilities. Initial runner launch overlapped the browser download; rerun after installation and corrected seeded-fixture expectations passed. No product code changes were needed for the covered behaviors. Broader accessibility, cross-browser and actual HTTPS deployment checks remain open. See BROWSER-TESTS.md.

## 2026-10-10 — Automated accessibility and text contrast

Added five pinned axe-core/Playwright accessibility tests with WCAG 2 A/AA and 2.1 A/AA tags across login at desktop/mobile sizes, four role dashboards, notice views and publishing dialogs. Fixed detected low contrast in sidebar connection text, role text, avatar initials, form labels and modal legends. Tests use the existing isolated synthetic server and run in the existing CI command without paid services. No rule suppressions. Automated scans complement rather than replace screen-reader and broader accessibility review.

Validation: production web build passed; all 11 browser tests passed (six workflow regressions and five accessibility tests). Dependency audit reported zero vulnerabilities.

## 2026-10-10 — System, light and dark themes

Added a keyboard-accessible Theme selector on login, the workspace header and mandatory-password setup. System is the default and follows OS preference changes live. Explicit light/dark choices persist in browser local storage, synchronize across tabs and remain usable when storage is blocked. Theme changes use CSS without animation loops, network services or new packages. Dark surfaces include navigation, panels, forms, dialogs, tables and operation controls; contrast scans caught and corrected inherited light-theme text. Exported documents retain their own formatting. Added browser checks for system tracking, persistence and dark login/dashboard/dialog accessibility.

Validation: all 13 browser tests passed, including theme behavior and dark-mode axe scans. Final web build passed after extending dark styles to operational helper surfaces.

## 2026-10-10 — Responsive theme controls and dark dropdowns

Removed absolute positioning from the mobile login theme control and gave it its own grid row. Workspace headers below 1000px now grow with wrapped controls, keeping the school selector and theme control above content rather than overlapping cards. Added dark option backgrounds/text and contrasting hover/selected/checkmark formatting across dropdowns. Theme selects reserve space for their arrow. Added a regression checking login separation, header/content boundaries and horizontal overflow at 320/390/768px, plus dark option colors.

Validation: web build and all 14 browser tests passed, including the new responsive layout and dark option regression.

## 2026-10-10 - School-first workspace branding

School workspaces now use their own display name and scanned uploaded logo in the main brand position, with an original initials-based fallback logo. The platform owner portal and shared login retain platform identity. A small Powered by Schoolglass Desk credit remains in the sidebar. Existing audited school-scoped accent settings drive buttons, navigation, sidebar/header tint and hero decoration, with calculated black/white text contrast. Managers can choose Forest, Ocean, Violet, Rose or Amber presets in Settings, or keep a custom hex accent. Personal System/Light/Dark brightness preferences remain independent. Added a principal-to-student palette persistence test and kept school-switch checks. Navigation background fading was removed to keep text contrast stable during selection.

Validation: production web build and all 15 browser tests passed, including school palette sharing, school switching, responsive layouts and light/dark accessibility scans.

## 2026-10-10 - Unified palettes and navigation polish

Unified school palette surfaces across the shell, panel/header/table backgrounds, badges, statistic icons, hero planet/rings/chips, dropdown highlights and neutral readable text. Compact select controls and popup options use smaller padding and bounded popup height. Only users assigned multiple schools see the school picker. Navigation uses eleven additional original SVG glyphs so each section has a distinct icon. Sidebar navigation reserves scrollbar space, disables horizontal overflow/scroll anchoring/end overscroll and removes hover translation to avoid end-of-list jitter. Browser checks cover distinct glyph geometry, scroll end stability, visible logout, single-school picker absence and multi-school switching.

Validation: all 16 browser tests passed; after final select/overscroll adjustments the five targeted school-brand/theme tests and final web build passed.

## 2026-10-10 - Shared appearance fallback

Applied the user-authorized fallback after dynamic appearance proved inconsistent. Removed school palette/custom accent controls and personal System/Light/Dark selectors, deleted the theme controller and broad dynamic CSS overrides, and fixed all workspaces to the original light appearance. Old stored accents and browser preferences cannot alter it. Kept school names/uploaded logos/fallback monograms, platform credit, compact selects, responsive header, distinct icons, stable sidebar scroll and conditional school switching. Regional settings saves retain the API-compatible fixed accent. Replaced retired theme tests with a regression for the shared appearance under an OS dark preference and old stored dark setting.

Validation: production web build and all 14 browser tests passed, including role accessibility, shared appearance under retired dark preferences, responsive layout and sidebar stability.

## 2026-10-10 - Two-option animated appearance toggle

Restored personal brightness preferences with a compact animated Light/Dark button group; System is implicit on fresh browsers rather than a visible option. System changes are followed until an explicit choice is made; choices persist and synchronize across tabs. Animation respects reduced motion. Login uses an in-flow toggle above its form and the workspace uses the responsive header, preventing overlaps. School palettes remain disabled and school identity is retained. Dark surfaces cover panels, inputs/options, dialogs, academic/report hints and operational helper surfaces; original photos/logos retain their colors rather than being inverted. Expanded axe scans to every principal page in both modes and publishing dialogs; fixed academic hint and table-heading contrast found by broader checks.

Validation: web build passed. Complete browser run passed 16 checks and found one transient light navigation contrast failure; after removing navigation fading, all three final appearance tests passed, covering system default/persistence and every principal page plus publishing dialog in both modes.

## 2026-10-10 - Sidebar identity and compact idle toggle

Removed the duplicate school badge/name/logo from school sidebars; the main identity is followed by the city. Owner mission-control details remain. Replaced wide text labels on appearance buttons with compact sun/moon symbols and accessible Light/Dark labels. The selected sun rotates slowly and the selected moon drifts continuously, using CSS transforms only; reduced motion disables both. The Pinterest page was inaccessible, so this is an original design rather than a copied animation. Validation: web build and nine targeted workspace/branding/responsive tests passed; compact-width, animation, reduced-motion and preference test passed.

## 2026-10-10 - Recorded day/night scene switch

Inspected frames from the user-provided MP4. Recreated its oval scene, layered rings, moving crescent/sun thumb, skyline, window lights, clouds and twinkling stars using original inline SVG/CSS rather than embedding or redistributing the reference media. A single accessible Dark mode switch provides light/dark states in a 96 by 48 pixel control, with system default, remembered choice and reduced-motion support. SVG gradients/clipping have unique instance IDs. Reference frames and decoder tools remain in ignored local data. Preview rendering was inspected locally.

Validation: final web build and scene-switch behavior passed; both complete principal-page appearance scans and responsive check passed. Final thumb-direction preview was visually inspected.

## 2026-10-10 - Rolling ball and complete scene transition

Corrected the reference switch mechanics based on the user's explanation: the ball now rotates 150 degrees as it travels, rotating the crescent with it. A warm sun gradient replaces the pearl/moon while the crescent withdraws and fades. The whole exposed track crossfades to a sunny sky with clouds and blue buildings; stars and illuminated windows fade out, and reverse when returning to night. Movement and scene morphing share an 850ms transition. Idle stars/clouds remain animated; reduced motion disables travel animations and applies end states immediately. Validation: web build passed; preference/animation regression passed with day/night background, sun, rotation and star-layer endpoint assertions. Both rendered endpoint previews were inspected.

## 2026-10-10 - Remove toggle divider

Removed the stationary yellow and pale-blue arcs highlighted by the user, leaving continuous day/night scenery behind the rolling ball. Ball rotation, moon/sun morphing and scene transitions are preserved.

## 2026-10-10 - Circular toggle ball and responsive gradient rim

Clipped the moon shading inside the circular ball so it cannot distort the outline. Enlarged the ball to fill the rounded track end and added a gradient outer rim. Reduced the control to 88 by 44 pixels on desktop and 76 by 40 pixels on small screens, retaining rolling transitions, idle animation and reduced-motion support.

Validation: web build, preference/animation regression and responsive checks passed. Inspected rendered light and dark endpoints; the responsive test verifies the compact width and layout at 320, 390 and 768 pixels.

## 2026-10-10 - Phase 4 local release bundle

Implemented school privacy notices with leadership approval and version checks, password-confirmed exports restricted to the requesting account, reviewed access/correction/deletion requests, and a leadership record inventory. Privacy requests use the existing Operations workflow; closing a request does not erase records. Owner and support sessions cannot perform personal exports or privacy mutations. Added the Security-page interface and documented reviewed disclosure, retention, holds and backup handling without inventing jurisdiction requirements.

Added bounded health/readiness probes, isolated synthetic capacity checks, a local release evidence report and a three-engine browser verifier. Each engine receives a fresh server so real authentication limits remain intact. Fixed Firefox dark input contrast by isolating its unsupported picker selector and WebKit dialog focus restoration for pointer and keyboard interactions. Added CI verification and optional container tooling; the container fallback remains unverified because Docker image download failed with the system drive full.

Documented later domain/HTTPS setup, production configuration, privacy operations and pilot acceptance. The user has no domain yet. Real-data release still requires school-approved privacy/consent/retention, independent security and manual accessibility review, actual-host deployment/restore acceptance and a controlled pilot. These external gates remain open in the plan.

Validation: final release verifier passed all 60 API tests, production build, all 54 browser scenarios (18 each in Chromium, Firefox and WebKit), and the isolated capacity check. Dependency audit reported zero vulnerabilities. Disposable MySQL operations checks passed privacy metadata roundtrips; development database preflight and local health/readiness probes passed. Visually inspected the dark privacy screen for spacing and readability. The report records the pre-commit revision and dirty working tree explicitly rather than claiming clean commit evidence.

Firefox/WebKit installs exposed a full C: drive. Only browser caches installed during this work were removed, and test browsers were installed in ignored apps/api/data/browsers on D:. C: remains nearly full; free system-drive space before further Docker work. No school database or user files were deleted. Remote CI, live HTTPS and container verification are not claimed as passed.

## 2026-10-10 - Login demo guidance and footer spacing

Login now checks the backend health mode and only renders demo shortcuts when it explicitly reports demo mode. MySQL and unavailable backends expose no demo credentials. Moved the login footer into normal document flow with a 24px gap so expanding content cannot overlap it. Validation: production build passed; Chromium checks against the running MySQL app at 1366x600 and 390x700 confirmed hidden demo guidance and a 24px gap below the login card.

## 2026-10-10 - Fictional school account import workbooks

Filled the supplied People import template with two separate sets of 24 fictional Indian students and 6 teachers, using unique name-based @whss.sgd and @sas.sgd identifiers. Each set spans Grades 6, 7 and 8, sections A/B, academic year 2026–2027. The supplied class lookup was empty, so these are proposed class choices that must be created with matching labels in each target school before import. Preserved import headers and role validation, original workbook sheets and first-school identity; the second workbook uses SAS Demo School. Verified saved row counts, plain-text fields, unique domains/class choices, and rendered readability. No accounts were imported. Current bulk import requires administrator-assisted recovery before users can set their initial password and log in; these identifiers do not provide mailboxes.

## 2026-10-10 - Bulk import temporary credentials

Kept the People upload template and columns unchanged. Successful atomic import now issues an independent cryptographically random 24-character temporary password for every account and returns a separate school-branded credentials workbook only to the importing normal management session. Workbook serialization happens before the transaction. Password hashes alone persist; neither previews nor audit records store plaintext credentials. The importing page offers download/dismiss controls, clears credentials on school change and never writes them to browser storage. Downloads remain available only while that page is open; recovery handles lost credentials. Existing mandatory first-login password change applies.

Validation: all eight Phase 2 API tests passed, including student/teacher temporary login, mandatory change gate, old-password rejection, unique passwords, replay denial, teacher authorization denial and plaintext absence from users/previews. Production build passed. Chromium end-to-end import verified unchanged headers, real template upload, successful credential download and dismissal. Existing imported accounts are not retroactively changed.
