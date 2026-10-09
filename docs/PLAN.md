# Product and implementation plan

## Product model

Schoolglass Desk has three surfaces: a platform owner console, a responsive school web workspace, and later a React Native mobile app. All share one Node API and MySQL database. The two web surfaces initially share a React deployment with server-enforced role gates; separate subdomains/builds can follow without duplicating the backend.

Organizations group schools. Access is explicit membership, never just an organization match. Directors can switch between assigned schools within an organization. Each school maintains its own academic configuration and operational data.

Independent schools have no organization and retain separate explicit memberships. Independent accounts belong to one school. Platform owners can reproduce issues with a 30-minute audited support session using an existing account’s permissions.

## Roles

| Role                        | Scope and capabilities                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Owner                       | Onboard organizations/schools, create leadership accounts, platform KPIs, audit activity |
| Director                    | Manage assigned schools across an organization                                           |
| Admin / principal           | Manage one or more assigned schools, classes, teachers/students/staff, notices           |
| Teacher                     | Assigned classes/subjects, attendance, marks, learning resources                         |
| Student                     | Own results/attendance, assigned class materials and targeted notices                    |
| Staff                       | Own profile and applicable notices; job-specific permissions later                       |
| Parent / guardian (planned) | Explicit linked-child access, never unrestricted class access                            |

## Phase 1: Initial web MVP — implemented

- [x] Animated responsive Orbit design, login and role navigation.
- [x] Organization and school onboarding and explicit school memberships.
- [x] Director school switching and backend tenancy checks.
- [x] Principal/admin creates classes and school users.
- [x] Attendance and mark-entry forms and editable class tables, provisional exam totals/percentages, printable report view.
- [x] Class-scoped homework/syllabus/timetable/material links and PDF/image uploads with authorized downloads.
- [x] Administrator-assisted password recovery with expiring single-use tokens.
- [x] School and role/class-targeted notices.
- [x] MySQL persistence adapter, optional isolated demo mode.
- [x] Real-record count dashboards and latest audit activity.
- [x] Authorization regression tests.
- [x] Independent-school onboarding and isolated memberships.
- [x] Owner support sessions with reasons, audit attribution, expiry and visible return controls.
- [x] Original SVG branding/glyphs, glass palette and performance-conscious motion. See ASSET-PROVENANCE.md.

## Phase 2: Complete core academics

- [x] Versioned MySQL migration into separate tables, typed core academic/account fields, membership junctions, unique registers, mark/date checks and school-scoped foreign keys. Immutable snapshots and optional metadata retain JSON extensions; the old records table remains a backup.
- [x] Academic years, current-year selection, grades, sections, subjects and editable teacher subject assignments.
- [x] Terms, enrollment history and reviewed year promotion with stale-preview checks and student session invalidation.
- [x] Atomic attendance and configured exam marks batches.
- [x] Holiday-aware attendance: transactional write guards, closure reasons, retained history and holiday exclusion from dashboard percentages.
- [x] Attendance correction requests with reasons, independent leadership approval/rejection, stale-record checks and audited history.
- [x] Session-wise attendance alongside Daily, with independent register identities and session labels in correction history and Excel exports.
- [x] Exam schedules, configurable grade bands, subject weighting, pass thresholds and draft/published results.
- [x] Student report cards, manager publication, reasoned reopening, immutable versions and manager archive access.
- [x] Dedicated PDF exports with verified multi-page layout, school template settings and snapshot-preserved typed teacher/principal sign-off names. These are printed sign-offs, not cryptographic signatures.
- [x] Text homework submissions, own-attempt history, lateness tracking, teacher feedback and revision requests.
- [x] Private submission attachments, fail-closed local ClamAV integration, school/student quotas and staged/orphan cleanup. Uploads remain disabled until ClamAV is configured, as requested.
- [x] Weekly class timetable, assigned-teacher validation, class/teacher/room overlap checks and audited editing/cancellation.
- [x] School calendar: multi-day events, school-wide holidays, class/role audiences, audited editing and reasoned cancellation.
- [x] Yearly calendar Excel templates with Sunday/Saturday holiday preferences, full-year validation, review previews and atomic audited imports that preserve manual entries.
- [x] Yearly planning lives on Calendar, with country/state/region public-holiday references and Include/Exclude preferences; India 2026 includes verified central gazetted dates.
- [x] Date-specific timetable substitutions, conflict checks, audited cancellation and holiday-aware dated timetable display.
- [x] Account suspension/reactivation with session revocation and audited authorization.
- [x] Authorized school-account name/contact updates with transactional audit records.
- [x] Account-access milestone: persistent MySQL sessions/recovery, mandatory first-login password change, authenticated password updates and device-session revocation.
- [x] Authorized role and school/class assignment editing, with teaching dependency and academic-history guards.
- [x] Reasoned login-email changes, emailed invitations, periodic token cleanup and indexed user/token lookup. Email changes revoke recovery links and sessions.
- [x] Configurable TLS SMTP recovery delivery, rate limits and delivery-failure auditing/revocation. Email remains disabled until school-provided SMTP is configured, as requested; assisted recovery remains available.
- [x] Search and paginated tables/directory API, reviewed Excel people imports with row errors and single-use previews, and permission-scoped attendance/directory/results exports.

Phase 2 implementation is complete. SMTP and ClamAV adapters are intentionally unconfigured; their real infrastructure acceptance checks happen after configuration. Release hardening and production deployment remain Phase 4 work. See PHASE-2.md for setup and operating details.

## Phase 3: School operations

- [x] Management-created admissions with reasoned review/admission/rejection/withdrawal, atomic student onboarding, private student profiles and guardian contact links, and enrollment history. Parent authentication is a separate milestone below.
- [ ] Fee schedules, concessions, outstanding balances and receipts with manual payment recording first.
- [ ] Staff profiles, leave requests and approvals; payroll as an optional later module.
- [ ] Library catalog, lending and returns.
- [ ] Transport routes and assigned students; no live GPS until privacy and infrastructure decisions.
- [ ] Inventory/assets, support tickets, visitor logs, certificate/document requests.
- [ ] In-app notification inbox with read receipts and teacher/guardian messaging.
- [ ] Parent portal with linked-child switching.
- [ ] School branding, academic settings and localization.

## Phase 4: Release quality — required before real student data

- [ ] Cross-tenant penetration review, durable audit logs, restrictive database permissions.
- [ ] Data retention rules, consent and privacy notices appropriate to operating jurisdictions.
- [ ] Backup encryption, restore drill, export/deletion process and incident response.
- [ ] Unit/integration/E2E test suite including MySQL and keyboard/accessibility tests.
- [ ] Monitoring and actionable platform KPIs: active schools/users, request failures, latency, storage and activity.
- [ ] Secure HTTPS deployment, infrastructure secrets, CSP tuned to production assets, database isolation.
- [ ] Pilot with synthetic data first, then a controlled school trial after release checks.

## Phase 5: Mobile — after web acceptance

Use React Native with Expo open-source tooling. Reuse API contracts, permissions, school switching, and backend logic. Start with login, dashboard, notices, attendance/results and learning resources. Add secure token storage, notification permissions, uploads, offline read cache, and conflict-aware writes. App-store distribution may have fees; a free PWA/Android APK is the initial zero-cost path. Do not assume free iOS App Store publication.

## Design principles

Use a calm light workspace with a dark orbital hero, lavender accents, subtle motion, clear tables and mobile-friendly navigation. Respect reduced-motion preferences. Animation must never obstruct mark entry, attendance, or accessibility. Public school marketing websites are a separate optional module; the school workspace remains authenticated.

## Work tracking

Update this checklist and WORKLOG after each meaningful milestone. Commit one reviewable change per feature/fix. Do not claim the entire ERP is complete because the MVP screens exist.
