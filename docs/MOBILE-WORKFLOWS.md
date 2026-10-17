# Mobile workflows and design comparison

Updated 17 October 2026. The mobile app uses the same Node.js API, MySQL database, private R2 files and school permissions as the website. Existing school data was not migrated, reseeded or deleted.

## Selected design and navigation

Glass is the chosen app style. The website's mint/deep-teal identity and original Schoolglass mark remain, with soft blue, mint and pink colour washes behind readable light/dark cards. The supplied layout inspired the compact dashboard; no external artwork or shopping-company assets were copied.

A global safe-area-aware top bar displays **Schoolglass Desk** before sign-in, the selected **school name** on Home, and the **service title** on each service page. Back navigation is available on service pages and **Sign out** stays in the top bar throughout the signed-in session, including mandatory password change and school selection.

The floating bottom bar has **Home, School day, Services and Profile**. Profile replaces More and displays the current user's name, email, role, school and accessible classes, with appearance/password controls and school switching when applicable. Services mirrors the website sidebar for the current role. Each sidebar section and its eligible actions have separate routes; shared workflow components preserve the existing permissions and forms. Library and Transport have distinct focused pages. Platform administration and other desktop workflows remain discoverable through their own explanatory pages and **Available on the website** popup. Opening the website is explicit and does not transfer credentials or the app token.

A director with multiple authorized schools must choose a school on a separate screen after sign-in, before any workspace fetch. Profile's Switch school returns to that chooser; a valid selection survives foreground session revalidation. A fresh app launch asks again. Single-school users enter their workspace directly. Selection does not grant any new server permissions.

Navigation chrome uses the SDK 57 native Liquid Glass material on supported iOS devices, with a blur/tinted fallback elsewhere and an opaque iOS Reduce Transparency fallback. Only the navigation bars use live materials; record cards remain inexpensive translucent surfaces. Each stacked screen has its own backed colour wash so earlier text cannot show through. Native Stack slides between screens, the web preview uses a short fade/translation, and reduced motion disables decorative transitions. The hero animation remains background/focus-aware. Light/dark starts with the device appearance; all new chrome uses the shared colour palette.

See [current dashboard preview](screenshots/mobile-dashboard-glass.png). Browser previews verify layout/contrast, not native optical material fidelity; physical iOS/Android appearance, transitions and file sharing remain acceptance steps.

## Native workflow coverage

| Role                     | Available workflows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student                  | Notices/read receipts, inbox, resources/private documents, written homework answers and optional PDF/image attachments, own submitted attachments, dated timetable/holidays/substitutions, calendar, attendance history, published results/reports, fees/receipts, private event gallery, own student/guardian record lookup, library catalogue/loans, assigned transport, support tickets, school document requests/downloads, privacy policy/requests/password-confirmed personal export, password change/reset/sign-out |
| Guardian                 | Existing child switch and child-scoped daily views; inbox, teacher messaging, library/transport visibility, support and document requests, privacy actions and password change                                                                                                                                                                                                                                                                                                                                             |
| Teacher                  | Assigned-class people lookup, dated timetable with cover teachers/holidays, calendar, notices/read receipts/inbox, attendance recording and correction requests, configured exam marks for assigned subjects, published report sharing, learning links/files/homework publication, latest-submission review/revision and private attachment sharing, multi-class/section student notices, gallery viewing, own leave requests/cancellation, guardian messages, library/assigned assets, support/privacy/password actions   |
| Principal/admin/director | Teaching workflows plus school people/student/admission lookup, correction and independent leave decisions, exam publication/reopening, calendar event publication/cancellation, dated cover-teacher assignment, event photo uploads with permission confirmation, school services, support updates, school document issuance/review, library issue/return, visitor check-in/out, fee ledger, recording collected payments/concessions, voiding payments and receipt sharing                                               |
| Supporting staff         | Calendar/notices/inbox/gallery, own leave/cancellation, own operational records, library/assigned assets, support/privacy/password actions, as permitted by the existing API                                                                                                                                                                                                                                                                                                                                               |
| Platform owner           | School/organization onboarding, support impersonation, diagnostics and platform administration remain in the website                                                                                                                                                                                                                                                                                                                                                                                                       |

Attendance now uses one reviewed class roster per date/session through the existing atomic batch endpoint. Marks remain saved per student through the existing validated exam register. There is no automatic write retry. Forms require an explicit review/confirmation step. Request-key endpoints reuse the form's key across retries; after an uncertain response refresh records before resubmitting. Published exams remain locked and attendance changes use the existing correction workflow.

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


## Icons and motion feedback — 17 October 2026

The app now uses original local SVG line icons for dashboard tiles, Services, navigation and action buttons. Icons scale without remote downloads or font loading; visible labels and accessible button names remain. Schoolglass and uploaded school identity marks are preserved. Choice chips stay compact without decorative arrows.

Screen changes use a 440 ms eased lift/zoom/fade alongside native Stack sliding; fixed navigation stays in place. Loading records uses an orbit around a school mark with a breathing centre. Sign-in, password changes, document sharing and submissions expose busy feedback; shared forms show a larger saving state and upload forms say Uploading your file. A spring checkmark appears only after a successful response. Indeterminate indicators do not claim percentage progress or impose minimum wait times. Existing write locks, error messages, school boundaries and manual retry behavior remain unchanged.

Reduced Motion disables the orbit/pulse and transition motion while preserving loading labels. Loading loops stop when their screen loses focus, the app backgrounds, or the component unmounts. Transform/opacity animations use the native driver on devices. Verify their feel on both phones; browser animation checks cannot measure device frame rate.


## M4.1 — Active account sessions

Profile and Services → Security now expose Active sessions for every role, including the platform owner. This is account-wide security, not a school administration permission. Users can inspect their own sign-in metadata and confirm signing out other sessions while keeping the current sign-in. Cancellation is available before the write; the result is refreshed after server acknowledgement. No tokens are displayed or copied, no automatic write retry, no new backend route or migration. A stale account/school response is rejected by the client and a 401 clears the signed-in state. See MOBILE-PILOT-CHECKLIST.md for the two-device acceptance walkthrough and remaining release gates.


## M4.2 — Date selection and class attendance

The dashboard keeps one Browse all services action, removing the overlapping School workspace and School services buttons. Existing quick actions and Services navigation remain.

Mobile input dates use the SDK-compatible system date picker on Android/iOS; web previews use a browser date control. This applies to timetable lookups, cover dates, calendar ranges, leave ranges, material/homework due dates, library due dates and fee payment dates. Optional due dates can be cleared. Attendance and timetable initialize from the device's local calendar date, avoiding UTC-day conversion. Other forms retain explicit date choice. Existing school date/holiday validation remains authoritative.

Record attendance → choose class/section → today (or choose another date/session) → Mark remaining present → change exceptions → Review class attendance → Confirm class attendance. Unmarked students block submission; existing records display their saved status and are locked. Only new records are sent together in one /attendance/batch request. There is no per-pupil confirmation or automatic retry. The endpoint validates the entire request transactionally and rejects invalid rosters, holidays and attempts to change saved statuses. Use Attendance corrections for changes. The register follows the existing 200-entry batch limit; it does not silently split larger classes into partially saved requests.

Changing date/session resets unsaved selections; the selected date is locked during submission. Successful saves show the date/count; use Refresh school records to reload the saved history. After an interrupted response, refresh before attempting another save. Class/school changes discard the local draft and stale UI updates are ignored. Physical native-picker and long-roster acceptance remains pending.


## M4.3 — Ambient motion, navigation and login fit

Added a decorative travelling accent rail and rotating edge-orbit particles to each backed screen, with a single transform phase per focused page. Motion stops on navigation blur, background, unmount and Reduced Motion; effects never imply network connectivity or submission progress. No animated layout, network polling or extra per-card live blur is used. The existing hero and request loaders retain their own lifecycle controls.

The top bar now carries the original brand mark and an icon/text Sign out action; the floating glass dock uses a solid accent capsule for the active tab and a softer shadow. All titles, actions and content continue using shared light/dark colours.

Login is compact, with a short welcome header, account form and small brand/endpoint footer. Removed the oversized hero and signed-in footer clearance from login. At normal phone heights it fits without scrolling; actual measured overflow enables scrolling on small screens, larger accessibility text, keyboard resize and longer errors/status messages. Keyboard avoidance and reachable reset/sign-in controls take precedence over rigid clipping. Native keyboard and device smoothness still need phone acceptance. No API, account, school data or dependency changes.

Preview: [compact login](screenshots/mobile-login-compact.png). Screenshots are local dummy data; animations require the running app.


## M4.4 — Aurora and glass refinement

Added softly graduated mint/violet aurora shapes behind screen content, drifting and breathing on the same focused animation phase as the orbit/rail. Radial gradients provide a soft-focus appearance without an animated blur filter. The shared loop runs every 10 seconds, pauses when inactive/unfocused and becomes static with Reduced Motion. Screen entry now uses a 520 ms eased fade/lift with a small zoom overshoot and settle, clipped to the content boundary to prevent transient horizontal overflow.

Navigation's blur fallback intensity is 65, with a diagonal glass highlight above native/fallback material. Text and record surfaces stay backed; no extra record-card BlurView, image download, network polling or new dependency. Native Liquid Glass and Reduce Transparency fallbacks remain capability checked. Device smoothness/material fidelity remains a phone acceptance item; browser checks validate transform movement, contrast and layout.


## Copy consistency — 17 October 2026

Standardized application-owned labels/statuses to sentence case, with acronyms such as UPI/PDF/URL retained. Records use readable field labels (Student name, Admission number, Created on) instead of camelCase keys; selected boolean fields display Yes/No. Roles, attendance choices/totals, resource types, submission/exam statuses and profile metadata use the same presentation helpers. Fixed singular/plural session and attendance messages and incomplete fallback punctuation. Stored values, submitted option IDs, passwords, email/URL casing, names and user-written notices/answers remain untouched. This is display formatting only and needs no API migration or Render deployment.


## M4.5 — Month calendar, report tables and task-specific tabs

Calendar now renders a local-date month grid with previous/next month and Go to today controls. Holiday fills, event dots, today/selected outlines and a legend describe the markings. Selecting a date expands its published events/holiday descriptions; the list below shows holidays overlapping the displayed month, including multi-day ranges. Cancelled/invalid records are excluded. Only the school/child-visible calendar entries returned by the existing API are used: the app does not invent holidays from a country list or treat every Sunday as a published holiday without school calendar data.

Student and guardian results use an in-app subject/marks/outcome table with school identity, totals, grade, published version and school-configured sign-off names. Teachers/leadership select a published exam and eligible student to view the same report; the old download-only form is removed. Download report card PDF uses the existing authenticated approved-publication endpoint and native save/share sheet, retaining its school logo, formatting and teacher/principal sign-off lines. Names are not cryptographic signatures; this update does not forge or generate handwritten signatures or upload signature images. Report access/publication/class boundaries remain enforced by the backend. A school must configure its branding/report sign-off names through the website. Unsupported/unconfigured graphics are not fabricated.

Home, School day, Services and Profile now have distinct destinations. School day is a focused daily-task hub. Service pages carry their opening tab: Services → Library stays under Services; Profile → Active sessions stays under Profile; School day tasks remain under School day. Dashboard daily/work shortcuts open School day tasks. Tapping an already active tab returns to its hub. This removes the previous blanket /service/* → School day classification. Repeated feature openings reuse the existing route instead of pushing another identical screen. Duplicate global refresh buttons are removed where a service already owns a record refresh control; guardian report cards no longer nest duplicate cards/headings. The content viewport now reserves the floating dock's space; redundant 120 px footers are reduced so controls cannot sit underneath the dock.

Horizontal screen swipes navigate adjacent tabs with a short directional slide/fade; vertical scrolls and open-keyboard gestures are not treated as tab switches. The green indicator is a draggable tinted glass capsule with spring translation/stretch/settle inspired by the owner's reference clip. Native Liquid Glass is capability checked; other platforms use a tinted blur/highlight approximation. Exact optical refraction is OS-dependent and cannot be verified from a web screenshot. Reduced Motion removes settling motion; direct dragging still follows the user's input. Swiping navigates without submitting forms; drafts are local and are not automatically saved. Phone back-gesture, keyboard, drag feel and native material/share-sheet acceptance remain required.

No new backend, migration, dependency or production data changes. No paid service or Render deployment is required. Changes reuse the existing calendar/report endpoints and file delivery controls.

Local dummy-data previews: [month calendar](screenshots/mobile-month-calendar.png), [teacher report card](screenshots/mobile-report-card.png). The running app is required to review drag/swipe motion.
