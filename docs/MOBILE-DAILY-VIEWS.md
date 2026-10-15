# Mobile student and guardian views (M2)

Implemented 15 October 2026 in apps/mobile. The same accounts, school/class permissions, MySQL records and private R2 files serve web and mobile. No data migration or replacement backend is needed.

## Available views

- Student/guardian daily navigation: Notices, Homework & resources, Timetable, Calendar, Attendance, Published results, Fees & receipts and School gallery.
- Guardians choose among their currently linked children. Changing child hides the previous child's records while the next request loads. Missing/revoked selections can be reset; only server-authorized links are accepted.
- Notices show class-appropriate content. Explicit Mark as read uses the existing idempotent inbox receipt endpoint. A guardian can view student-addressed notices through the child portal, but acknowledgement is shown only when the guardian's inbox grants that action.
- Homework/resources show descriptions, due dates, approved external web links and authenticated class attachments. Students can see latest submission status/teacher feedback. Sending homework answers/attachments remains on the website for this milestone.
- Date-specific timetable views apply school holidays and teacher substitutions. Guardians receive only linked-child periods and no internal substitution reasons. Times are the school's timetable times; the starting selected date follows the device's calendar date and can be changed explicitly.
- Attendance counts recorded sessions, excludes holidays, and never treats missing dates as absences.
- Students see only published exam results; guardians see only their child's current published report versions.
- Fee balances, payment history and manual payment receipts are visible. There is no online payment processing or bank-settlement verification.
- Gallery metadata is paginated; a private image is fetched only after View photo. No public bucket URLs are created.

## Documents and privacy

Resource files, published reports and receipts are retrieved through bearer-authenticated API routes. Native Android/iOS uses the OS share sheet after an explicit tap. Generated report/receipt HTML preserves the existing school branding; student reports can use the PDF export. The server retains its publication/role/child/class checks.

Temporary export files are written only inside a dedicated app cache directory, removed after sharing, and any residue is cleaned on next startup when possible. Documents deliberately shared to another app are outside Schoolglass Desk's control. No broad device-storage permission, public file link, third-party file hosting or new paid service is introduced. Web review cannot validate OS file sharing and intentionally reports that native sharing is required.

School/session generations reject stale requests. Child-view unmount guards prevent a late file result opening a share sheet after the child selection changes. Data stays in memory; no offline attendance, marks or payment writes are added. Server access checks still apply even if someone crafts a native route manually. Use Refresh school records or Refresh family records to retrieve new data; the app also revalidates after foregrounding.

## Backend compatibility and deployment

Two additive guardian reads are included:

- GET /api/schools/:schoolId/family/timetable?childId=<id>&date=YYYY-MM-DD
- GET /api/schools/:schoolId/family/fee-payments/:paymentId/receipt

The existing family child payload now includes that child's payments. Receipt formatting is shared with the unchanged student/leadership receipt route. Guardian resource downloads now use the configured local/R2 storage adapter instead of a local-disk-only read. No schema migration or new runtime database grants are required.

Deploy the latest GitHub main commit in Render before testing new guardian timetable/receipt actions against the live API. If Auto-Deploy is Off: Render → service → Manual Deploy → Deploy latest commit. Normal build/start commands and secrets stay the same. No backup restore, reimport, data reset or scanner/billing change is required. Until the new backend is deployed, the old service may return 404 for these new routes. Native-source changes alone do not update the hosted backend.

## Try it on your phone

1. If updating a different checkout, pull main and install its mobile dependencies: npm --prefix apps/mobile ci.
2. Restart Metro from the project root using npm run mobile:start. For cache problems: from apps/mobile run npx expo start --clear.
3. Open the matching Expo Go client; physical iPhone needs the same Expo account in CLI and Expo Go. The added Expo modules are included in the compatible Expo Go version. Signed development/release binaries need rebuilding to add native packages.
4. Sign in with a STUDENT or GUARDIAN school account. Principal/teacher daily management workflows are the next milestone; those accounts do not impersonate students to preview these screens.
5. Test child switching, notices, a dated timetable, an available published result and fee receipt. Use dummy school data first. A guardian requires active verified child links established through the existing school onboarding flow; no real accounts were created by this implementation.
6. On Android and iPhone, test attachment/report/receipt sharing and returning from the share sheet. Check keyboard/back navigation, portrait/landscape, light/dark, logout and revoked-session handling.

Initial local development instructions are in apps/mobile/README.md. Browser-only review and JS export do not certify native behavior. Existing upstream mobile dependency advisories remain distribution gates; no store submission or paid build is enabled.

## Validation

- Complete API regression suite: 77 tests passed, including four new guardian payment/receipt, dated-timetable, revoked-link and cloud-adapter pause tests. Provider calls were not made by these fixtures.
- Mobile suite: 17 tests passed, including session request scope, URI/filename validation and holiday-aware recorded-session summaries; TypeScript and lint passed.
- SDK Doctor: 21/21 passed. Android/iOS/web JavaScript exports and the existing web production build passed.
- Isolated 390px web review covers all eight student pages, guardian class/child switching without other-child homework, fees, explicit notice read receipt and light/dark accessibility/overflow. New guardian views were visually inspected.
- Real phone OS sharing and the newly deployed guardian routes still need operator/device acceptance. No live student records or credentials were used in tests.

School reads allow a bounded 90-second cold-start deadline, including navigation after idle. Writes retain the shorter 25-second deadline and are not retried automatically. No background keep-awake polling is used.
