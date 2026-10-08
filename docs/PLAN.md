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

- [ ] Normalize MySQL schema with constraints and migrations. School-locked transactions and stable register IDs are implemented in the current adapter.
- [x] Academic years, current-year selection, grades, sections, subjects and editable teacher subject assignments.
- [ ] Terms, enrollment history and year promotion.
- [x] Atomic attendance and configured exam marks batches.
- [ ] Holidays, session-wise attendance and correction approvals.
- [x] Exam schedules, configurable grade bands, subject weighting, pass thresholds and draft/published results.
- [x] Student report cards, manager publication, reasoned reopening, immutable versions and manager archive access.
- [ ] Dedicated PDF export verification, school-specific templates and signatures. Browser print/Save as PDF layout is implemented.
- [x] Text homework submissions, own-attempt history, lateness tracking, teacher feedback and revision requests.
- [ ] Private submission attachments, malware scanning, upload storage quotas and cleanup.
- [x] Weekly class timetable, assigned-teacher validation, class/teacher/room overlap checks and audited editing/cancellation.
- [ ] Date-specific substitutions, holidays, school calendar and events.
- [x] Account suspension/reactivation with session revocation and audited authorization.
- [x] Authorized school-account name/contact updates with transactional audit records.
- [ ] Login-email changes, membership/role editing, invitations/first-login change and persistent sessions.
- [ ] Password reset delivery using an administrator-provided SMTP server, rate limits, and recovery auditing.
- [ ] Search, pagination, imports with preview/error reporting, export permissions.

## Phase 3: School operations

- [ ] Admissions workflow, student profiles, guardian links and enrollment history.
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
