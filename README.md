# Schoolglass Desk

A multi-school workspace built with React, Node.js, and MySQL. One API serves the platform console and school web workspace; a mobile client will reuse it later.

![Schoolglass Desk school dashboard](docs/screenshots/schoolglass-dashboard.png)

## Current delivery

An evolving web implementation with grouped or independent school onboarding, role-based accounts, audited owner support sessions, multi-school switching, academic setup, atomic attendance/marks registers, published weighted report cards, learning resources, assisted password recovery, notices and dashboards. There is no public registration. Production readiness and remaining modules are tracked in the plan.

## Requirements

- Node.js 22.12+ (Node 24 recommended), npm, Git.
- MySQL 8.4, or Docker with permission to start containers.
- No paid services or API keys required. Docker licensing eligibility depends on the organization; running MySQL Community directly is an alternative.

## Start with MySQL

```powershell
npm install
docker compose up -d
Copy-Item apps/api/.env.example apps/api/.env
# Edit BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD before first initialization.
npm run db:init
npm run dev
```

Open http://localhost:5173. Sign in with the bootstrap owner credentials from `apps/api/.env`. Create an organization, school, and leadership account. Sign in as that school's principal/admin to create classes and teacher/student accounts. A director can be assigned multiple schools in the same organization.

MySQL persists in the `orbit_mysql` Docker volume. `docker compose down` stops it without removing data. Do not remove the volume unless you deliberately want to delete the database. The Compose passwords are local development values, not deployment secrets.

## Explore without MySQL

From the root, in PowerShell:

```powershell
$env:DATA_MODE = 'demo'
npm run dev
```

Demo emails: `owner@orbit.local`, `director@orbit.local`, `principal@orbit.local`, `teacher@orbit.local`, `student@orbit.local`. Password: `OrbitDemo123!`. Demo data is ephemeral, visibly labeled, and prohibited when NODE_ENV is production. Unset DATA_MODE to return to MySQL. Demo credentials are independent of the MySQL bootstrap account.

## Academic workflow

1. A principal/admin opens Academics to create an academic year and grade/section classes.
2. Create teacher/student accounts in People with their class memberships; assign subject teachers in Academics.
3. Configure an exam schedule, subject maximum marks, weights, pass thresholds and grade bands. The defaults are editable examples.
4. Teachers save their assigned subject registers in Results. Each batch succeeds completely or rolls back.
5. Management publishes once every enrolled student has every required subject score. Students see only their own published report.
6. Management can reopen with a reason and republish a new version. Earlier snapshots remain available to management. Reports include a browser print/Save as PDF layout; standalone PDF export remains planned.

Demo mode includes a draft Midterm assessment. Historical unconfigured marks remain available to staff for review.

![Published report card](docs/screenshots/report-card.png)

## Verify

```powershell
npm test
npm run build
# Requires configured MySQL; removes its disposable test fixtures.
npm run db:check
```

The 17 backend integration tests cover isolation, roles, recovery, uploads, atomic registers, academic configuration, publication, weighted grading, immutable report versions, independent schools and audited support sessions. The MySQL check verifies rollback and concurrent school transaction serialization.

## Boundaries

Organization is optional when onboarding a school. Independent-school accounts are assigned to one school; grouped directors can retain multiple explicit school memberships. The owner can use People → Open as user to reproduce an issue under the selected account’s permissions, with a reason, visible banner and 30-minute expiry. Saved support changes affect real data and are audited. Account-security changes require the normal administrator session.

Original SVG/CSS assets and system fonts power the design. See [asset provenance](docs/ASSET-PROVENANCE.md) for authorship and naming limitations.

The English working title is configured in `apps/web/src/brand.js`. Dropdowns use styled native pickers in supporting browsers, with a rounded native fallback. People includes Suspend/Reactivate controls: owners manage school accounts; school management can manage assigned teachers, students and staff. Suspension revokes sessions and recovery tokens and blocks login; reactivation requires a fresh login. Support sessions cannot change account status.

People → Edit profile updates an authorized school account’s name and optional contact number. Login email, role and memberships are not editable through this form. Profile changes are audited; support sessions cannot perform them.

Dialogs use a consistent unblurred dim backdrop and opaque readable surface. Background scrolling is locked while a dialog is open, keyboard focus stays inside, and Escape closes dialogs with a close control. Continuous motion is confined to decorative marks, rings and small indicators, with reduced-motion support.

- The MySQL adapter stores JSON records with indexed type/school columns and school-locked academic transactions. Normalized tables, foreign keys, migrations and database-level academic uniqueness remain planned.
- Sessions and reset tokens are held in API process memory. Server restart signs everyone out. Use a persistent session store before running multiple API instances.
- Automated email reset delivery is not implemented. In either mode, an authorized administrator opens People → Recover account, verifies the user's identity, and privately provides the 15-minute token. The user opens Forgot password → I have a recovery token. Demo additionally exposes a token for self-testing. Do not represent this as an email integration.
- Resources accept HTTPS links or PDF/PNG/JPEG uploads of up to 5 MB. File signatures are checked and downloads require school/class authorization. Files are stored under ignored `apps/api/data/uploads`; back up this directory with MySQL. Malware scanning, submissions, storage quotas and cleanup are planned. Files must never be served as public static assets. Ephemeral cloud storage is unsuitable for these uploads.
- Attendance and configured marks batches are atomic, with at most 200 entries per request. Subject assignments constrain teacher writes. Publication freezes weighted report snapshots; corrections require reopening and republishing. Terms, enrollment rollover, session attendance and dedicated PDF export remain planned.
- There is no payment gateway, SMS, WhatsApp, paid AI service, push provider, or hosting subscription.
- API binds to loopback by default. After `npm run build`, `npm start` serves the API and built React frontend at http://127.0.0.1:4000. Production deployment requires an HTTPS reverse proxy, origin policy, environment management, and an appropriate HOST value.

See [the plan](docs/PLAN.md), [architecture](docs/ARCHITECTURE.md), [free-cost strategy](docs/FREE-COST.md), and [work log](docs/WORKLOG.md).
