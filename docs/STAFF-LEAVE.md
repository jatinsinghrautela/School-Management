# Staff profiles and leave

This Phase 3 milestone adds the **Staff** tab for directors, admins, principals, teachers and supporting staff. It uses the shared API and local MySQL database without external services or paid dependencies.

## Employment profiles

School leadership can add or edit an employee number, job title, department and joining date for employees explicitly assigned to the selected school. Employee numbers are unique within that school. Profiles are separate from account permissions: editing a profile never changes the login, role or school memberships.

Teachers and staff can see only their own profile and leave history. School leadership can see school employee profiles and requests. Students and direct platform-owner sessions cannot access this workspace. Owner support sessions reproduce the target employee's read permissions but cannot change profiles or leave records.

Profiles contain no salary, bank details, medical documents or emergency contacts. Avoid putting sensitive medical information in leave reasons. Profile updates retain the previous values in the management audit trail.

## Leave workflow

1. An employee opens **Request leave for myself**, selects inclusive start/end dates and a type (personal, sick, annual or other), then provides a reason of 5–500 characters.
2. The API rejects impossible dates, reversed ranges, ranges longer than 366 calendar days and overlap with the employee's pending or approved requests at that school. Requests may include past dates for retrospective records.
3. A different director, admin or principal approves or rejects a pending request with a reason. Employees cannot approve their own requests, including principals. A school with only one leader must onboard another authorized leader for that leader's leave approval; the platform owner cannot bypass this rule.
4. An employee can cancel their own pending request with a reason. A different school leader can cancel approved leave with a reason. An employee should ask leadership to cancel approved leave; approved dates cannot be changed in place.
5. Rejected/cancelled requests remain in history, and the employee can submit another request for those dates. Decisions cannot be reopened or overwritten. Leadership may reject an unresolved request or cancel approved leave after the employee leaves the school; new approval requires a current, active school employee.

Submission keys prevent duplicate entries when a request is retried. Reusing a key with different details returns a conflict. School transactions serialize overlap checks and decisions, so concurrent approvals/rejections cannot both succeed. Every change has a transactional audit entry; each request retains its decision history and the reviewer name at decision time.

Search and status filters show 15 requests per page. The current API loads the school-scoped history in one response; server pagination and archival remain future scaling work.

## Limits and deployment

Leave does not automatically update attendance, substitute teachers, reduce leave balances or calculate pay. Arrange timetable coverage separately. This module has no entitlement policy, half-day leave, attachments, statutory leave rules, payroll or email delivery. Payroll remains optional later work. No integration sends email or money.

MySQL migration **7** creates typed `sg_staff_profiles` and `sg_leave_requests` tables with school/user references, employee/profile uniqueness, retry-key uniqueness and date/status/type checks. Tenant membership is verified by the API; existing historical requests are retained when memberships change. Existing tables and legacy records are preserved. Back up the database before applying migrations to a deployed environment.

Validation: 40 API tests pass, production build passes, and disposable MySQL fixtures verify profile uniqueness, school references, leave retry-key uniqueness, dates, status and typed date round-trips. API tests cover private views, role gates, cross-school reviews, independent decisions, concurrency, retries, cancellations, inactive accounts and support write restrictions.

Interactive visual/keyboard acceptance remains unverified: browser automation currently fails to initialize with a missing kernel-assets path. Review Staff at desktop and narrow widths with synthetic data before release. Phase 4 release checks remain required before real employee/student data.
