# Schoolglass Desk — LinkedIn launch draft

## Ready-to-post copy

A school dashboard is easy to demo. A connected school workspace is much harder to build.

That challenge became Schoolglass Desk — my AI-assisted project, now live.

The problem I wanted to solve: school operations are often split across spreadsheets, messages and disconnected tools. Admissions, accounts, attendance, fees and timetables then become repeated work, with information reaching the wrong people or arriving too late.

My approach was to connect those workflows around one school-aware backend.

What makes this project distinctive is the combination:

• Independent schools and groups of schools in the same platform, with explicit memberships and school switching.
• Role-based workspaces for leadership, teachers, students and guardians, with class/section-scoped notices and resources.
• Spreadsheet onboarding that generates individual temporary credentials and requires a password change on first login.
• Student/teacher enrollment numbering, yearly fee planning and holiday-aware calendar imports.
• Timetable drafts that check teacher, class and room conflicts before saving.
• Time-limited, audited owner support sessions to reproduce issues using an existing account’s permissions.

Under the interface:

React → shared Node.js API → MySQL
Private files → Cloudflare R2
Deployment → Render + Aiven + Cloudflare

The engineering goes beyond CRUD: school authorization on private downloads, verified database TLS, restricted runtime grants, atomic imports and persistent R2 usage reservations that survive redeploys. School records and files live outside Render’s disposable filesystem.

My biggest learning: a feature is not finished when its screen looks good. It is finished when permissions, validation, failure handling, data preservation and deployment work together.

Building this taught me about multi-tenant data boundaries, relational modeling, concurrency, Excel workflows, responsive design, accessibility and cloud cost controls. AI accelerated implementation; testing and iteration shaped the result.

This is a live pilot, with free-tier availability limits and further operational hardening ahead — including complete cloud backup automation and malware scanning. The mobile client is planned to reuse the same API.

Explore: https://schoolglass.jatinsinghrautela.com

If you were designing a school platform, which workflow would you connect first?

#SchoolglassDesk #EdTech #FullStackDevelopment #ReactJS #NodeJS #BuildInPublic

## Technical overview for a follow-up article or portfolio

### Problem and original contribution

Schoolglass Desk connects school identity, user provisioning and academic/administrative operations in one workspace. Its distinctive contribution is the integration of independent-school and organization structures with class-scoped access, spreadsheet-first workflows, support reproduction and persistent cost controls. It is an original project implementation; no claim of being the world's first school platform or a patented invention is made.

### Architecture

One React frontend and Node.js API are hosted by a Render web service. MySQL on Aiven stores users, school memberships, records and file metadata. R2 stores private file bytes. Same-origin API routes simplify the browser deployment; a future mobile client will use the same backend. Cloudflare fronts the custom domain. Independent schools do not need artificial organizations.

### Authorization and support

Roles and explicit school/class memberships govern access. Leadership and teaching workflows are scoped to permitted students/classes; guardian links govern child access. Private file routes enforce application authorization instead of exposing public bucket links. Owner support sessions use an existing account's permissions, require a reason, expire and retain audit attribution. They are not unrestricted anonymous impersonation.

### Imports and operational workflows

Teacher and student templates preserve appropriate distinctions: teachers can have multiple class/section assignments; student records can include guardian/admission data. Imports validate before atomic application. Successful user onboarding produces individual temporary credentials with first-login password changes. Enrollment number allocation is serialized by school and retains historical identifiers. Timetable drafts use bounded search and conflict checks; they do not guarantee a solution to every staffing constraint. Calendar preferences and yearly fee planning reduce repetitive data entry.

### Persistence and cost controls

School records and upload bytes are kept outside the app host's ephemeral filesystem. The R2 adapter reserves usage atomically in a persistent MySQL ledger before operations. Current counters are cumulative, not monthly, with conservative no-refund behavior. SDK retries are disabled and writes are conditional. App caps do not govern dashboard uploads, other tokens or other buckets and do not guarantee a zero bill.

### Learning outcomes

- Model tenant and class access explicitly rather than relying on hidden UI buttons.
- Separate migration privileges from everyday runtime grants.
- Treat spreadsheet import as a validation, transaction and credential-handling workflow.
- Handle concurrent numbering and cost reservations using database coordination.
- Design graceful failures for unavailable storage, cold starts and malformed responses.
- Preserve existing records while evolving features and deploying new code.
- Test responsive layouts and light/dark contrast alongside business logic.
- Use AI as an implementation collaborator while verifying behavior and claims.

### Scope and honest limitations

The application is a live pilot, not a certification of production readiness for sensitive student data. Hosted uploads are explicitly configured without malware scanning. Full current-cloud backup/recovery automation remains future work. Free hosting has availability/capacity limits. Bot controls reduce unwanted requests but do not eliminate them. Mobile development is planned, not shipped. No public demo credentials or student information should accompany the post.

## Image

Use the accompanying original AI-generated launch illustration. It is a conceptual promotional visual, not an actual product screenshot. Suggested alt text: Schoolglass Desk illustrated as a connected school campus with Schools, Teachers, Students and Guardians cards, above a React, Node.js, MySQL and private R2 architecture strip.

Image-generation prompt and asset location are recorded alongside this draft. Review the final copy and visual before publishing; nothing has been posted to LinkedIn.
