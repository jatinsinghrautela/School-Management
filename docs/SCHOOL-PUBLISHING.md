# School publishing improvements

## Notices: multiple classes and sections

**Notices → Publish notice** includes a checkbox for each accessible class/section (for example Grade 10 · A and Grade 10 · B). Select any combination; one notice is stored and appears only to its selected role audience and matching class membership. Leadership can leave all unchecked for a school-wide role audience. The previous single-class records remain compatible.

Teachers can publish only to **students**, must select at least one current assigned class/section, and cannot select another teacher's classes or another school. The API rechecks current assignments during publication. Teachers can view their own published notices while they retain access to a target class. Leadership retains school oversight. Parents see child-scoped notices through Family; revocation removes that access on subsequent requests.

Notices show their class/section scope and offer a branded printable HTML download. Existing audited owner support behavior for notice reproduction is preserved; media/account onboarding writes require normal management sessions.

## Admission accounts: one approval workflow

Approval already creates the student account and enrollment automatically. During **People → Admissions → Start review**, select the guardian contacts whose identity and child-access permission you have verified. Contacts need a valid email. **Admit student** then creates the student and creates/reuses compatible parent accounts plus explicit child links in the same transaction. An incompatible email or invalid contact rolls back the whole approval; no half-created student remains.

A parent account is reused only if it is active and already authorized for this school; email similarity never independently grants access. Siblings can share one verified parent account. Guardian contact storage consent and account-access verification are separate decisions. Contacts with no email can remain contact-only; add a verified email through the supported record/link workflow when login is needed.

The final admission row states which accounts were created/linked. Do not create that student again through Add person. **People → Recover account** is the activation step, not another account-creation step: privately supply a recovery token after verification or use configured SMTP. Student/new parent accounts require first-login password change and have no shared known default password. Family remains available for later authorized contact changes and existing students.

## View ledger

**Fees → View ledger** selects a particular student fee charge, scrolls to its detail panel and moves keyboard focus there. The panel is below the charge table, which explains why the previous button could appear unresponsive.

It shows outstanding balance, payments/printable receipts, concessions and void history for that charge. Normal leadership can record manual payments/concessions and reasoned corrections. Students have a read-only own-charge view. Clicking it does not process a payment or move funds. A student can have several charges, each with its own ledger.

## School logo and documents

Normal leadership opens **Settings → School logo** and uploads a **256 × 256 PNG**, at most **128 KB**, exported without interlacing. Dimensions and pixel bounds are checked server-side. Transparent padding works well. Logos display at 36px in the sidebar and 64–72px in document headers using their original aspect ratio.

A configured local ClamAV scanner is required. No scanner means a disabled file input and a fail-closed API; see PHASE-2.md. Scanning failure creates no media record. Storage quotas apply.

The logo appears on new report snapshots/PDFs and report print views, manual receipts, ready certificates/document requests, downloadable notices and generated workbook **School identity** sheets. Excel data/template rows remain unchanged so imports still round-trip. Uploaded PDF/PNG/JPEG learning-material downloads receive a branded PDF cover, followed by the material; the stored original is preserved. This uses pinned MIT-licensed `pdf-lib` on the server and the existing PDFKit dependency; no external service is called. Source PDFs must be valid, unencrypted and within 200 pages for the branded copy. External resource links continue to point to their source publisher.

When a logo was present during publication, that document's logo snapshot is retained. Older unbranded downloads can use the current logo. Replace the school logo through Settings; optimistic versions prevent overwriting concurrent settings changes. Private file storage must be backed up with MySQL. Old logos remain for history and count toward storage quota.

## Gallery

**Gallery** is available to signed-in members of the selected school, including parents. Leadership uploads event photographs with a title/caption and confirms publication permission. Teachers/students/parents can view; they cannot upload or remove photos. This gallery is not a public unauthenticated website.

Photos accept PNG/JPEG up to **5 MB**, **4096 × 4096**, and **16 megapixels**. The server removes EXIF/IPTC/comment/text metadata from the published copy. Scanning and school storage quotas apply. Photos are loaded lazily, decoded asynchronously and requested in pages of twelve; only currently visible school members can retrieve them. Removal is reasoned and audited, hides subsequent image requests and retains history/files. Saved copies cannot be remotely recalled; permanent retention/deletion policy remains Phase 4 work.

## Validation and migrations

Migration **v9** adds the gallery table and scoped file/school/user foreign keys; existing notices use metadata extensions for their multiple targets. Back up before upgrading.

-

pm test`: 46 passing tests, including teacher scope, parent notice isolation, atomic guardian onboarding/reuse/rollback, image dimensions/pixel checks, metadata removal, branded downloads/exports and unavailable-scanner failure.
-

pm run build`: production build passes; no PDF library was added to the frontend bundle.
-

pm run db:operations`: typed gallery boolean round-trip and cross-school file constraint checks pass using disposable fixtures.

- Browser: multiple class selection/publication, teacher-only assigned-class choices and own publication visibility, focused fee ledger, integrated guardian review and disabled gallery/logo upload controls reviewed. Screenshot evidence is in docs/screenshots.
- A synthetic two-page branded resource PDF was rendered and both pages reviewed. No real student images or records were used.

SMTP/ClamAV infrastructure acceptance checks remain pending configuration. Phase 4 release requirements still apply before real student data.

## School workspace identity

After login, the workspace uses the selected school display name and uploaded logo, or an original initials-based fallback. All schools share the same palette. A compact animated Light/Dark toggle is available on login and in the workspace. It follows the device preference until an explicit choice is saved; System is not a visible option. Old school accents do not change the workspace. Regional settings and logo uploads remain available. The shared login and owner console retain platform branding, while school workspaces show a small Powered by Schoolglass Desk credit.
