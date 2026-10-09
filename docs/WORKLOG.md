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
