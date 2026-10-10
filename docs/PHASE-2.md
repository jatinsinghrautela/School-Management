# Phase 2 operations

## Academic workflows

Academics includes terms, school-defined attendance sessions, school report templates and class promotion. Terms must fit their academic year and cannot overlap. Promotion moves the reviewed active roster into a later year that has started, retains enrollment history and previously approved own reports, and invalidates student sessions. Previews expire after 15 minutes and cannot be reused; roster changes require a new review. Bulk imported students and newly onboarded students receive enrollment history.

Daily remains a separate attendance choice. Existing entries require the correction approval workflow. Morning/afternoon sessions have independent records. Exports retain historical closures and identify whether each record belongs to a school day.

Timetable now has a dated view with active school holidays and manager-controlled substitutions. Substitute teachers must be assigned to the class and free at the period time. Changes retain audit history. Cancel affected substitutions before editing a weekly schedule. Students receive substitute identity without the private staff reason.

Report templates capture heading, accent and typed principal/class-teacher names at publication. Download PDF uses the immutable approved snapshot, with archived versions available to management. These names are printed sign-offs, not cryptographic signatures. A synthetic 32-subject, three-page report was rendered and reviewed for readable text, repeated table headers, page breaks and totals. Unicode font/localization support is a later enhancement.

## SMTP configuration: safely disabled by default

Set SMTP_HOST, SMTP_PORT (587 or 465), SMTP_USER, SMTP_PASSWORD, SMTP_FROM and PUBLIC_APP_URL in the ignored API environment file. PUBLIC_APP_URL must use HTTPS except localhost development. Port 587 requires STARTTLS; 465 uses implicit TLS. Restart the API after changing configuration. Use an existing authorized school mailbox and follow its sending limits. No external mail was sent during development; delivery was tested with an injected fixture mailer.

Managers can choose an emailed invitation/recovery link from account recovery. Missing configuration returns a clear unavailable state, retaining private assisted recovery. Public reset responses remain generic. Links last 15 minutes, carry tokens in the browser fragment, and are single-use. Delivery failure revokes the link. Login-email changes need a reason and invalidate old sessions/recovery links. Authentication endpoints and management recovery issuance are rate limited. Before enabling real delivery, test TLS and delivery to an authorized test inbox, including failure handling.

## Upload scanning and storage

Set CLAMAV_COMMAND to the absolute executable path of an installed local clamscan. Maintain signatures with freshclam and verify scanner/definition health before enabling school uploads. The API pipes bytes to clamscan without a shell, enforces a 30-second timeout, and accepts only a clean exit. Missing configuration, scanner failures or timeouts reject uploads; infected files are rejected. Real ClamAV is not installed/configured in the current development setup, so the UI disables file inputs. Integration tests use a mock clean scanner solely to exercise access and storage behavior.

Only PDF, PNG and JPEG files up to 5 MB are allowed. SCHOOL_STORAGE_MB defaults to 250; STUDENT_STORAGE_MB defaults to 20. Both must be positive. Files remain outside the public web directory and download through authenticated, scoped routes. A student's staged attachment is private until submitted. Once bound to a submission, it cannot be reused for a different attempt. Text homework and resource links remain available when uploads are disabled.

The API runs cleanup every 30 minutes: expired security tokens older than seven days, expired previews older than one day, and unattached staged uploads older than one day. Unreferenced UUID-named regular files older than one day are removed; bound submission attachments and durable academic/audit records are retained. Back up both MySQL and the private upload directory together before a pilot.

## People and export tools

People offers an unchanged Excel template with Class choices, student/teacher/staff role validation, row errors, a review preview and a single-use atomic apply. Up to 200 users can be imported per workbook. Formulas and invalid class/role/email rows are rejected. Each imported account receives an independently generated temporary password and must change it on first login. The successful import returns a separate credential workbook to its importing manager, with a download button available while that page remains open. Save it before navigating away and share credentials individually. Only password hashes are persisted; the credential workbook is not stored on the server or in browser storage. Lost credentials require account recovery. Support impersonation cannot bulk-create accounts.

Shared tables paginate at 20 rows. GET directory supports search and page/limit parameters, with visibility applied before counts. Directory export is restricted to normal management sessions; attendance and results exports enforce school/class/student permissions. Results exports include current approved versions and preserve student access to their own past approved reports after promotion.

## MySQL upgrade and verification

Use MySQL 8 with enforced CHECK constraints. Back up the database first, stop older app instances, then start the updated API with its normal configured database credentials. The migration requires table/constraint DDL permissions and records versions in sg_migrations: backfill, foreign keys, school-scoped foreign keys, and independent audit/token school metadata. Legacy records remain as a pre-upgrade backup. New live writes go to the relational tables, so reverting application code alone is not a data rollback.

Run npm test, npm run build, npm run db:check, npm run db:security and npm run db:relational. Database checks create isolated disposable fixtures and remove only their own fixtures. Production readiness, backup restore exercises and penetration/accessibility review remain in Phase 4.
