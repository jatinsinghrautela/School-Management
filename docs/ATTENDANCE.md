# Attendance and school calendar

Teachers record attendance only for assigned classes; managers can record within their accessible school. Students view their own records. The register saves selected student rows atomically and keeps blank rows unchanged.

An active, whole-school Holiday in Calendar closes attendance for its inclusive date range. Both batch and single-record endpoints enforce this inside a school-locked transaction, including Excel-managed holidays. Holiday changes and attendance writes therefore cannot bypass the check by overlapping saves. A write committed before a later holiday remains stored, but becomes excluded from the attendance percentage. Events, cancelled holidays and holidays belonging to another school do not close a date.

The register and single-record dialog show the holiday title and disable saving. School management must edit or cancel the closure before recording attendance. With overlapping holidays, every active closure must be resolved. Cancelled entries and their reasons remain audited. An Excel-managed Holiday can also be changed to Working through the reviewed import; manual holidays are preserved by that workflow.

Existing attendance is never deleted when a holiday is added. The history displays Calendar eligibility, and the workspace response supplies `excludedFromAttendance` and `holidayTitles`. Dashboard percentage is present/late records divided by recorded non-holiday records. Unrecorded days are not inferred as absences; excused records retain the existing denominator behavior. Cancelling or moving a holiday restores record eligibility automatically.

Only applied calendar entries close attendance. Downloading a template or uploading an unconfirmed preview has no effect. Sunday/Saturday preferences become closures after applying the yearly calendar, rather than being silently imposed on schools without a calendar.

Session attendance, correction approvals, expected-day reports and date-specific timetable substitutions remain planned. Use synthetic data until the release checks in PLAN.md are complete.
