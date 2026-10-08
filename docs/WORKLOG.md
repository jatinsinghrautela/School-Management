# Work log

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
