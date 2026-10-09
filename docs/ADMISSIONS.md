# Admissions and student records

In People, school management can open Admissions and student records. Students see only their own record. Teachers, supporting staff and the platform owner's direct account cannot retrieve private records through this API. Support sessions retain the target role's read permissions but cannot create admissions or edit profiles.

Applications are created by school management, with a student name, unique login email and school class. Optional details include an admission number, birth date, address and up to three guardian contacts. Recording contacts requires an explicit attestation that management is authorized to store them and share them with the linked student. Use synthetic records until Phase 4 privacy and retention checks are complete.

The workflow is Submitted → Reviewing → Admitted. Submitted/Reviewing applications can instead be rejected or withdrawn. Every decision requires a reason of 5–500 characters and retains actor/timestamp history. Final decisions cannot be overwritten. There is no public signup, automatic eligibility decision, payment or message delivery.

Admitting requires a class with a valid, non-ended academic year. Account creation, student profile, guardian links, enrollment and audit history commit together. Repeated/concurrent decisions create only one account. A conflicting login email or admission number rolls everything back. The account gets an undisclosed random password and mandatory password change; activate it through People → Recover account using configured SMTP or private assisted recovery.

Profiles show admission number, birth date, address, active guardian contacts and enrollment history. Management edits profiles; students have read-only access to their own. Saving replaces active guardian links, retaining previous links and consent metadata in storage. Admission numbers are unique per school. Profile edits do not change login identity or class access; use the existing account and promotion workflows.

Guardian contacts are contact records, not authenticated parent accounts. There is no automatic parent login or child access based solely on an email address. Verified parent-account linking and child switching remain planned separately.

API under /api/schools/:schoolId:

- GET /student-records: school management or the linked student, with role-scoped output.
- POST /admissions: normal school management creates a submitted application.
- POST /admissions/:applicationId/decision: reasoned lifecycle transition.
- POST /students/:studentId/profile: normal school management updates an enrolled student's record.

MySQL migration version 5 creates typed admissions, student-profile, guardian and guardian-link tables. Scoped foreign keys protect class/guardian references; profile/admission-number uniqueness is enforced in MySQL. Back up before upgrades, as described in PHASE-2.md.

Verification: full API suite and production build pass. Local MySQL was restarted without replacing its existing volume; the new migration, guardian cross-school rejection, profile uniqueness and admission class scope were verified with disposable fixtures. Interactive browser review could not run because the browser automation tool failed to initialize in this session; no browser screenshot or UI acceptance claim is made.
