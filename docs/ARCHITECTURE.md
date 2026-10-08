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

| Endpoint | Access | Description |
| --- | --- | --- |
| GET /api/health | Public | Health and persistence mode |
| POST /api/auth/login | Public | Email/password, token and safe user |
| POST /api/auth/forgot-password | Public | Neutral response; demo-only token |
| POST /api/auth/reset-password | Valid reset token | Password change and session revocation |
| POST /api/auth/logout | Signed in | Revoke current session |
| GET /api/me | Signed in | Safe user and accessible schools |
| GET /api/platform | Owner | Organizations, schools, users, latest audit |
| POST /api/platform/organizations | Owner | Create organization |
| POST /api/platform/schools | Owner | Create school in organization |
| POST /api/users | Owner or school management | Create permitted role with verified memberships |
| POST /api/users/:id/recovery | Owner or permitted school management | Issue a private 15-minute reset token after identity verification |
| GET /api/schools/:id/workspace | School member | Filtered classes/users/records |
| POST /api/schools/:id/classes | School management | Create class |
| POST /api/schools/:id/attendance | Teacher or school management | Upsert date/class/student attendance |
| POST /api/schools/:id/marks | Teacher or school management | Upsert exam/subject/class/student mark |
| POST /api/schools/:id/resources | Teacher or school management | Class-scoped HTTPS link and instructions |
| POST /api/schools/:id/uploads | Teacher or school management | Multipart file + resource fields, PDF/PNG/JPEG up to 5 MB |
| GET /api/schools/:id/files/:fileId | School/class member | Authorized private attachment download |
| POST /api/schools/:id/notices | School management | Broadcast by audience and optional class |

Mutations validate school/class membership and key fields. Responses use JSON and 400/401/403/404/409/413/500 status codes. Development uses a local same-origin Vite proxy; the API also serves the built React app after a build. Mobile will need documented origin/transport configuration and secure token storage.

## Planned relational schema

organizations → schools → academic_years → classes/sections; users → memberships → school/role assignments; enrollments link students to class/year; teacher_assignments link subjects/classes/teachers. Attendance has a unique (school, enrollment, date, session) constraint. Exams have publication state; marks have a unique (exam, enrollment, subject) constraint. Resources own private file keys, notices own recipients/read receipts, guardians have explicit student links. Foreign keys and transaction-safe writes are essential before operational launch.

The current `records` table is an MVP JSON persistence layer with id primary key and kind/school index, not this final schema. Reads are filtered in the application; replace broad collection reads with indexed tenant-scoped SQL and pagination in Phase 2.
