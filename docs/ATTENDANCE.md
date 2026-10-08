# Attendance and school calendar

Teachers record attendance only for assigned classes; managers can record within their accessible school. Students view their own records. The register saves selected student rows atomically and keeps blank rows unchanged.

## Correction approvals

Initial attendance saves create records. Re-saving the same status is idempotent; it does not change the record timestamp. Once saved, a different status requires an approved correction, even for managers and for the single-record endpoint. A batch attempting a direct status change rolls back all its rows. The register locks existing statuses and Mark all present fills only unrecorded students.

On Attendance, choose a saved record under Attendance corrections, a different status and a reason of 5–500 characters. Only teachers with class access and school leadership can request a change. One pending request is permitted per attendance record. Teachers see their own requests in currently accessible classes; leadership sees school requests. Students and staff do not receive correction reasons or request history.

Another director/admin/principal reviews the pending request with an approval or rejection reason. Requesters cannot approve or reject their own requests. Schools need a separate authorized leader to review leadership-originated requests. Approval verifies the original status and timestamp and checks that Calendar still allows attendance on the date. A stale or holiday-blocked request can be rejected with a reason, then submitted again if appropriate. Reviewed requests cannot be changed or reviewed twice.

Approval updates the record, records the correction ID and finalizes the request in one school-locked transaction. Rejection leaves attendance unchanged. Request and review audit entries retain the attendance ID, before/requested statuses and reasons; support-session actions retain the existing owner attribution. The history shows requester/reviewer names and timestamps. No paid service is required.

An active, whole-school Holiday in Calendar closes attendance for its inclusive date range. Both batch and single-record endpoints enforce this inside a school-locked transaction, including Excel-managed holidays. Holiday changes and attendance writes therefore cannot bypass the check by overlapping saves. A write committed before a later holiday remains stored, but becomes excluded from the attendance percentage. Events, cancelled holidays and holidays belonging to another school do not close a date.

The register and single-record dialog show the holiday title and disable saving. School management must edit or cancel the closure before recording attendance. With overlapping holidays, every active closure must be resolved. Cancelled entries and their reasons remain audited. An Excel-managed Holiday can also be changed to Working through the reviewed import; manual holidays are preserved by that workflow.

Existing attendance is never deleted when a holiday is added. The history displays Calendar eligibility, and the workspace response supplies `excludedFromAttendance` and `holidayTitles`. Dashboard percentage is present/late records divided by recorded non-holiday records. Unrecorded days are not inferred as absences; excused records retain the existing denominator behavior. Cancelling or moving a holiday restores record eligibility automatically.

Only applied calendar entries close attendance. Downloading a template or uploading an unconfirmed preview has no effect. Sunday/Saturday preferences become closures after applying the yearly calendar, rather than being silently imposed on schools without a calendar.

Session attendance, expected-day reports and date-specific timetable substitutions remain planned. Use synthetic data until the release checks in PLAN.md are complete.
