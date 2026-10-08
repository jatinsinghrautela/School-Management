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
