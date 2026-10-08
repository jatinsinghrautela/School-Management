# Architecture and API

## Layout

```
apps/web   React + Vite, platform and school interfaces
apps/api   Express 5, MySQL adapter, authorization, audit trail
docs       Plan, architecture, cost policy, work log
compose.yaml  Local MySQL service and persistent volume
```

## Security rules

Every school route authenticates a bearer token and verifies explicit school membership and organization match. Teachers and students see assigned classes only; students see their own marks and attendance only. Owners can manage all schools but do not automatically create school operational records. Principals/admins/directors can create teacher/student/staff users; only the owner creates leadership users. There is no signup endpoint. Client-hidden buttons never substitute for server permission checks.

Passwords use bcrypt. Session tokens are 32 random bytes and stored by SHA-256 digest server-side. Expiry is eight hours; tokens live in browser sessionStorage in this MVP (a hardened cookie or secure client token solution is required for production). Reset tokens expire in 15 minutes, are single-use and revoke existing sessions. Authentication endpoints are rate limited. Secrets and password hashes are omitted from responses. Audit writes record actor, action, school, and timestamp. These records are not yet tamper-proof or paginated.

## API v0

| Endpoint                           | Access                               | Description                                                       |
| ---------------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| GET /api/health                    | Public                               | Health and persistence mode                                       |
| POST /api/auth/login               | Public                               | Email/password, token and safe user                               |
| POST /api/auth/forgot-password     | Public                               | Neutral response; demo-only token                                 |
| POST /api/auth/reset-password      | Valid reset token                    | Password change and session revocation                            |
| POST /api/auth/logout              | Signed in                            | Revoke current session                                            |
| GET /api/me                        | Signed in                            | Safe user and accessible schools                                  |
| GET /api/platform                  | Owner                                | Organizations, schools, users, latest audit                       |
| POST /api/platform/organizations   | Owner                                | Create organization                                               |
| POST /api/platform/schools         | Owner                                | Create school in organization                                     |
| POST /api/users                    | Owner or school management           | Create permitted role with verified memberships                   |
| POST /api/users/:id/recovery       | Owner or permitted school management | Issue a private 15-minute reset token after identity verification |
| GET /api/schools/:id/workspace     | School member                        | Filtered classes/users/records                                    |
| POST /api/schools/:id/classes      | School management                    | Create class                                                      |
| POST /api/schools/:id/attendance   | Teacher or school management         | Upsert date/class/student attendance                              |
| POST /api/schools/:id/marks        | Teacher or school management         | Upsert exam/subject/class/student mark                            |
| POST /api/schools/:id/resources    | Teacher or school management         | Class-scoped HTTPS link and instructions                          |
| POST /api/schools/:id/uploads      | Teacher or school management         | Multipart file + resource fields, PDF/PNG/JPEG up to 5 MB         |
| GET /api/schools/:id/files/:fileId | School/class member                  | Authorized private attachment download                            |
| POST /api/schools/:id/notices      | School management                    | Broadcast by audience and optional class                          |

Mutations validate school/class membership and key fields. Responses use JSON and 400/401/403/404/409/413/500 status codes. Development uses a local same-origin Vite proxy; the API also serves the built React app after a build. Mobile will need documented origin/transport configuration and secure token storage.

## Planned relational schema

organizations → schools → academic_years → classes/sections; users → memberships → school/role assignments; enrollments link students to class/year; teacher_assignments link subjects/classes/teachers. Attendance has a unique (school, enrollment, date, session) constraint. Exams have publication state; marks have a unique (exam, enrollment, subject) constraint. Resources own private file keys, notices own recipients/read receipts, guardians have explicit student links. Foreign keys and transaction-safe writes are essential before operational launch.

The current `records` table is an MVP JSON persistence layer with id primary key and kind/school index, not this final schema. Reads are filtered in the application; replace broad collection reads with indexed tenant-scoped SQL and pagination in Phase 2.

## Academic transactions and publication

Academic configuration, register batches and publication use a dedicated MySQL connection and transaction. A school record lock (`SELECT ... FOR UPDATE`) serializes competing academic writes; audit entries commit with the change. Stable register IDs make repeated saves update the same record. Demo mode uses a queued transaction adapter with rollback.

Students receive only published exams and their own published marks. Publishing requires a complete roster and freezes weighted report snapshots. Reopening withdraws student access until republished, requires a reason and preserves earlier versions. Only management can retrieve archive history. Historical unconfigured marks are retained for staff review.

Routes under `/api/schools/:schoolId`:

| Route                                                                                     | Purpose                                                       |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| POST `/academics/years`, `/academics/years/:yearId/activate`                              | Create and select academic years                              |
| POST `/academics/classes`, `/academics/subjects`, `/academics/subjects/:subjectId/assign` | Configure classes and subject teachers                        |
| POST `/exams`                                                                             | Configure schedules, weights, pass thresholds and grade bands |
| POST `/attendance/batch`, `/exams/:id/marks/batch`                                        | Atomic validated registers                                    |
| POST `/exams/:id/publish`, `/exams/:id/reopen`                                            | Management-controlled versioned publication                   |
| GET `/reports/:examId/:studentId`                                                         | Authorized current published report                           |
| GET `/reports/:examId/:studentId/history`                                                 | Management-only immutable report history                      |

Terms, enrollment rollover and normalized academic SQL migrations remain planned.

## Independent schools and support access

Schools may have `orgId: null`. Organization membership never grants access by itself: explicit school membership remains required. An independent-school account can belong to exactly one school, so unrelated independent schools cannot accidentally form a group. Organization selection is optional during school and leadership onboarding.

The platform owner selects an existing account in People → Open as user, enters a support reason and acknowledges live-data changes. This creates a separate 30-minute session with the target’s existing permissions; it does not reveal or change their password. A persistent banner and Return to owner action identify this mode. Start/end events and attempted mutations record the owner, target and reason. Account-security mutations are blocked in support mode. Revoking or expiring the parent owner session invalidates support access. Sessions and recovery-token digests persist through the storage adapter; MySQL survives API restarts. User authentication versions invalidate sessions after password, access or account-status changes, including support sessions and their parent owner session.

## Account-access milestone

New accounts receive temporary credentials and must change their password before accessing workspace data. Authenticated password changes require the current password and revoke all sessions and recovery tokens. Recovery consumption is serialized under a user-row transaction so simultaneous uses cannot both succeed.

`POST /api/auth/change-password`, `GET /api/auth/sessions` and `POST /api/auth/revoke-others` provide password and device-session controls. Session responses omit token digests. `POST /api/users/:id/access` permits authorized role and school/class assignment edits. Leadership changes require the platform owner; school management can manage lower roles only within its schools. Self-edits and owner reassignment are blocked. Removing teaching dependencies or student classes with academic history requires the future enrollment/rollover workflow.

Assisted onboarding uses privately delivered temporary credentials; email invitations and SMTP delivery are not implemented. Tokens use the existing JSON record adapter, with pruning and indexed relational authentication storage still planned. `npm run db:security` verifies restart persistence, revocation and password invalidation against MySQL using disposable records that it removes afterwards.
