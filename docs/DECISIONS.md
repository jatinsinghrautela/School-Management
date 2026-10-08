# Decisions

## 2026-10-08

- Working brand: Orbit; it can be renamed without changing the tenancy model.
- Stack: React/Vite, Express/Node, MySQL Community. Mobile remains a later client of the same API.
- Two role-gated web surfaces in one deployment for the MVP. No public signup.
- Store school memberships explicitly. Being in the same organization is not enough to access a school.
- Initial school operations include manual single-record forms and editable class registers. Register writes save one record at a time and disclose partial progress if a write fails; transaction-based batch APIs are Phase 2 work.
- Provisional results aggregate achieved/max scores across recorded subjects in an exam. No unapproved grade boundaries, weighted marking scheme, or official publication is assumed.
- Resources use HTTPS links or local private PDF/image storage. Automated email delivery remains optional; administrator-assisted recovery is implemented.
- Free local operation is the reliable zero-new-investment baseline. Cloud hosting remains undecided.
- User authorized a new GitHub repository. After browser handoff, `jatinsinghrautela/School-Management` appeared as the new empty repository and is the selected destination.

## Academic milestone

- Initial provisional marks remain available for staff review. Configured exams now use atomic registers and published report snapshots, superseding the initial sequential-save approach.
- School locks serialize academic transactions in the existing JSON adapter; this does not replace the planned normalized schema.
- Schools configure grading, subject weights and pass thresholds. Default bands are examples, not an official grading policy.
- Teachers write only assigned subjects. Students see only their own published reports.
- Publication creates immutable versions. Reopening requires a reason and pauses student access; management can inspect archived versions.
- Browser printing provides a free report layout. Dedicated PDF downloads, school templates and export verification remain planned.
