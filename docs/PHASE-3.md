# Phase 3: School operations

The Phase 3 baseline is implemented across the shared Node API and responsive React workspace. All modules enforce explicit school membership, including independent schools. No paid service or new dependency was added.

## Available workflows

- **Library:** leadership maintains catalog editions/copies, lends to active school students or employees and records reasoned returns. Transactions prevent concurrent loans exceeding stock; editions with open loans cannot be retired.
- **Transport:** leadership configures routes, stops and capacity, assigns students and releases assignments with reasons. One active route assignment per student; capacity and occupied-stop edits are guarded. Families see only their own assigned routes. No GPS tracking.
- **Operations:** asset quantities/custody and retained changes; own support tickets with versioned leadership status updates; private leadership visitor check-in/out; student/parent document requests with leadership decisions and printable school-approved content. Certificates use typed issuer names, not digital signatures.
- **Inbox:** targeted notices and own notifications, manual refresh and read acknowledgements. Leadership can view notice receipts. Teacher/parent conversations require a currently assigned teacher and explicitly linked child; leadership cannot browse private conversations. No SMS, push, mail service or message attachments.
- **Family:** parents switch between explicitly linked children and view own attendance, current published reports, fees, class resources, timetable, notices and calendar. Sibling classes remain separate. Report/certificate exports are printable HTML; the existing student report workflow retains PDF exports.
- **Settings:** leadership selects school display name, generated text monogram, accent, locale and timezone. Regional date/currency formatting and English/Hindi family labels are implemented; this is not a complete translation of every management screen. Academic years, subjects and timetable configuration remain in Academics; report settings remain in Results.

Library, routes, private visitor records and asset management are leadership-controlled. Teachers/staff/students see only applicable personal records and may submit their own tickets. Students/parents request documents only for themselves/currently linked children. Owner troubleshooting uses the existing audited, time-limited support session, which remains read-only for these operations.

## Parent onboarding and revocation

1. Keep verified guardian contacts in Admissions / student records.
2. In **Family**, leadership selects the specific guardian contacts, confirms authorization and creates/links the parent account. The contact list identifies associated children; email similarity never grants access automatically.
3. In **People → Recover account**, privately supply an assisted recovery token after identity verification, or use configured SMTP. The parent completes activation and mandatory password change. No shared default password is issued.
4. Revoke a specific child contact link in Family with a reason when appropriate. Every child/report/download/message read rechecks current links. Changing/removing guardian contact details requires fresh verification; unrelated student profile edits preserve unchanged contacts.

Parents cannot access generic class rosters, school directories or academic management endpoints. Revoking a link hides associated conversations and child documents immediately on their next server request; historical records remain auditable. Previously downloaded files cannot be remotely recalled.

## Database and local checks

Back up MySQL and private upload storage before upgrading. Startup applies additive relational migration **v8**, including parent roles and thirteen typed operations/family tables with scoped foreign keys, uniqueness and value checks. Legacy records remain untouched as a migration backup.

```powershell
npm test
npm run build
npm run db:relational
npm run db:operations
```

`db:operations` requires the configured development MySQL database. It creates UUID-isolated synthetic fixtures, checks constraints/round-trips and cleans up only those fixtures. Do not run verification scripts against a production database.

Validation for this milestone: 42 API tests passed; focused operations tests passed after final roster filtering; relational and new operations MySQL checks passed. Browser review covered catalog/lending, route/stop assignment, branding, parent switching, responsive card spacing and accessible sign-out. Evidence is in `docs/screenshots/phase-three-*.png`.

## Current limits and release boundary

Records use manual search/pagination and refresh; the current API returns scoped module collections, so very large schools need server pagination and load testing before deployment. Fees are manually recorded payments, with no gateway/fund transfer. Payroll, live GPS and a full language catalog are outside this baseline. SMTP and malware scanning remain safely disabled until school-provided infrastructure is configured. Branding uses original code-generated monograms and existing original SVG/CSS assets; no stock image or external font was introduced.

Phase 4 privacy, backup/restore, security, monitoring, accessibility and HTTPS deployment checks remain required before real student data. Mobile development follows web acceptance and reuses this backend.
