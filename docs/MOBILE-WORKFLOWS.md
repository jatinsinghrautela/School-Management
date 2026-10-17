# Mobile workflows and design comparison

Updated 17 October 2026. The mobile app uses the same Node.js API, MySQL database, private R2 files and school permissions as the website. Existing school data was not migrated, reseeded or deleted.

## Selected design and navigation

Glass is now the chosen app style. The temporary Clay/Maximalism chooser has been removed. The mint/deep-teal palette and original Schoolglass mark continue to match the website; uploaded school logos identify the workspace header.

The dashboard uses a compact school/account header, feature search, four quick actions, an icon grid, a compact branded card and small summary cards. The supplied reference informed the layout; no shopping-company logos, banking content or external artwork were copied. A fixed safe-area-aware bottom bar provides Home, School day, Services and More. Scrollable screens reserve space so final controls remain reachable above the bar.

More and dashboard search list role-relevant native and website-only features. Website tools show **Available on the website**, a short explanation, **Open website** and **Stay in the app**. Opening the website is explicit and does not transfer credentials or the app token. The popup dismisses when school/session context changes, hides background accessibility content, supports platform back/Escape, and scrolls on small screens.

Native Stack uses short sliding screen transitions; the web preview gets a short fade/translation. Reduced motion disables these transitions and popup fades. The existing decorative hero animation remains background/focus-aware. Glass surfaces keep text readable without expensive per-card blur filters. Light/dark still starts with the device appearance.

See [current dashboard preview](screenshots/mobile-dashboard-glass.png). Older three-style screenshots are retained as design history, not current selectable modes.

## Native workflow coverage

| Role                     | Available workflows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student                  | Notices/read receipts, inbox, resources/private documents, written homework answers and optional PDF/image attachments, own submitted attachments, dated timetable/holidays/substitutions, calendar, attendance history, published results/reports, fees/receipts, private event gallery, own student/guardian record lookup, library catalogue/loans, assigned transport, support tickets, school document requests/downloads, privacy policy/requests/password-confirmed personal export, password change/reset/sign-out |
| Guardian                 | Existing child switch and child-scoped daily views; inbox, teacher messaging, library/transport visibility, support and document requests, privacy actions and password change                                                                                                                                                                                                                                                                                                                                             |
| Teacher                  | Assigned-class people lookup, dated timetable with cover teachers/holidays, calendar, notices/read receipts/inbox, attendance recording and correction requests, configured exam marks for assigned subjects, published report sharing, learning links/files/homework publication, latest-submission review/revision and private attachment sharing, multi-class/section student notices, gallery viewing, own leave requests/cancellation, guardian messages, library/assigned assets, support/privacy/password actions   |
| Principal/admin/director | Teaching workflows plus school people/student/admission lookup, correction and independent leave decisions, exam publication/reopening, calendar event publication/cancellation, dated cover-teacher assignment, event photo uploads with permission confirmation, school services, support updates, school document issuance/review, library issue/return, visitor check-in/out, fee ledger, recording collected payments/concessions, voiding payments and receipt sharing                                               |
| Supporting staff         | Calendar/notices/inbox/gallery, own leave/cancellation, own operational records, library/assigned assets, support/privacy/password actions, as permitted by the existing API                                                                                                                                                                                                                                                                                                                                               |
| Platform owner           | School/organization onboarding, support impersonation, diagnostics and platform administration remain in the website                                                                                                                                                                                                                                                                                                                                                                                                       |

Attendance and marks are saved one student at a time through existing validated batch endpoints. There is no automatic write retry. Forms require an explicit review/confirmation step. Request-key endpoints reuse the form's key across retries; after an uncertain response refresh records before resubmitting. Published exams remain locked and attendance changes use the existing correction workflow.

Fees are a record of money already collected by the school, not a payment gateway. Entry amounts are explicitly labeled in minor units (INR 10000 = INR 100). Server balance, version and approval validation remains authoritative.

## Work kept on the website

Keep spreadsheet imports/exports and credential distribution; verified account/admission creation and guardian linking; role/access configuration; school/organization lifecycle; school logo/privacy-policy configuration; academic year/term/subject/exam setup and progression; annual holiday workbooks; full timetable generation and weekly planning; yearly fee schedules; transport route/seat allocation and asset/catalogue administration; detailed report formatting, backups and deployment on the website. These involve bulk data, institutional verification, financial planning or platform configuration. Mobile offers daily lookup and appropriate operational actions rather than reproducing those large setup screens.

This is a substantial native daily-workflow expansion, not a claim that every website management screen has native parity or that signed-store release acceptance is complete. Admission/guardian verification and bulk/account administration have deliberately not been replaced with reduced mobile forms. Backend permissions remain unchanged.

## Update and deployment

1. The new private attachment endpoint requires the new backend commit on Render: Auto-Deploy on main, or Manual Deploy → Deploy latest commit. Wait for Live. No database migration or new environment variables are needed.
2. In the project root run `npm --prefix apps/mobile ci` if dependencies are not installed. The two added SDK-compatible modules are Expo DocumentPicker and Crypto; no paid service is configured.
3. Start/restart Metro with `npm run mobile:start`; reload Expo Go. If cache is stale, from apps/mobile run `npx expo start --clear`.
4. Use existing school accounts. The app does not create test users or reset any passwords in the live database. A compatible Expo Go includes these modules; a custom development binary must be rebuilt after native dependencies change.
5. The deployment changes only one additive API route. Upload policy, R2 caps, SMTP and current school data remain as configured.

## Data handling and acceptance

Authenticated reads/downloads remain school/class/student scoped. The new `/homework/submissions/:id/attachment-document` endpoint returns only an authorized finalized safe-status PDF/image, capped at 5 MB, using the configured local/R2 storage adapter. Another student, an unassigned class or a staged/deleted/unsafe file is denied. Files remain private; no public bucket URLs are introduced.

The picker requests PDF/PNG/JPEG up to 5 MB; backend signature checks and the configured malware policy remain authoritative. Picker-cache files are removed when the component leaves and after an upload attempt; temporary document sharing uses the existing app-private cache. Records are held in memory, and school/account switches fence stale responses. An OS-level exported copy belongs to the destination chosen by the user.

Verification: the existing backend suite passed 78 tests in the preceding workflow release; this UI update leaves the API unchanged. All 19 mobile tests passed; TypeScript and Expo lint passed; web/Android/iOS bundles exported. The isolated mobile browser suite covers the glass dashboard and website-only popup in light/dark, bottom navigation and 320px/390px layouts, narrow-screen accessibility, management tabs, teacher notices/attendance/marks, student homework and guardian isolation. Test writes use only an in-memory demo API, never live school records.

Physical iPhone/Android acceptance still required: file picker/cancellation, PDF/image upload under the active upload policy, SecureStore/resume, OS sharing and animation smoothness with reduced motion. Current upstream dependency audit findings documented in apps/mobile/README.md remain distribution gates. No signed APK/IPA, store submission, paid build, push service or offline write queue is claimed.
