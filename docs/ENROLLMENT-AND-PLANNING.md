# School records, imports and yearly planning

## Preserve records while removing access

Platform Owner → Schools now includes Edit / archive for schools and organizations. Names, city and school code are editable; organization membership remains explicit and is not silently reassigned. An archived school blocks its school users' access, while the owner's management records remain available for restoration. Archive the organization's active schools before archiving the organization. No schools, users, fees, attendance or historical records are deleted.

People already provides Edit profile and Edit access for student, teacher and parent accounts. Archive replaces Suspend as the roster action; Restore reactivates the account. Archiving revokes that account's sessions through the existing status workflow. Edit access supports multiple teacher classes/sections and allows an unassigned teacher. An unassigned teacher has no class access until assigned. Subject assignments must be reviewed before removing teaching access.

People → Guardian contact records adds Edit / archive for guardian contacts. Archiving ends active student and parent links while retaining their history. Restoring a contact does not automatically restore access links: authorize and link it again through the family workflow. Guardian contact edits do not silently change the separate parent login email. Edit that account's login profile in People.

## Password behavior

Passwords are not globally unique. Tests verify two users can select the same password, including reset and change flows. A password change requires a password different from that same account's current password, particularly when replacing a temporary password. Recovery tokens are single-use, expire after 15 minutes and become invalid after account/session version changes. Existing passwords were not reset or altered by this update.

## Separate Excel imports

People → Import teachers, students or staff provides:

- Original four-column People template for compatibility.
- Student template: Name, Email, Role, Class, Admission number, Birth date, Address, Guardian consent, plus name/relationship/phone/email for up to three guardians.
- Teacher template: Name, Email, Role, Class, Enrollment number and Phone.

For students, copy a single exact Class choice from the template's Classes sheet. Use ISO birth dates as plain text (`2013-01-15`), not formulas or Excel date serials. Enter `Yes` for Guardian consent only after authorization to store these contacts. Each guardian requires a name, relationship and phone or email. Imported contacts are available in student records; verified parent login links are managed separately through Family.

For teachers, separate multiple exact Class choices with semicolons, for example `Grade 6 · A | 2026–2027; Grade 7 · B | 2026–2027`. Each choice already identifies a class and section. Leave Class blank for an unassigned teacher; grant teaching access later through People → Edit access and assign subjects in Academics. Subject authorization and timetable staffing still require assigned active teachers.

Preview validates every row before the single-use atomic import. Existing accounts are never overwritten. The separate downloadable credentials workbook still gives each imported account a unique random temporary password. Users must change it at first login; save and privately distribute credentials before leaving the import page.

## School-code enrollment numbers

Missing student admission numbers and teacher enrollment numbers are generated inside the school transaction as `<school_code><six-digit incremental number>`, for example `WHSS000001`. Each school has separate student and teacher sequences. Archived profiles remain in the sequence so their numbers are not reused. Supplied numbers in new imports/admissions are retained and checked for duplicates within their school/role.

Existing students/teachers were aligned to this format. Previous numbers are retained in `previousEnrollmentNumber` and `previousEnrollmentNumbers` metadata. Student admission numbers appear in Admissions and student records; teacher enrollment numbers appear as Employee number in Staff. Original account IDs, class links, attendance, balances and guardian records are unchanged.

New automatically initialized staff profiles have preliminary job/department defaults and use the enrollment setup date as the initial joining date. A visible review message asks leadership to confirm the actual staff details. Editing the staff profile clears that message and retains prior-number metadata.

The idempotent operator command `node src/backfill-enrollment.js` from `apps/api` can align numbers again after a deliberate school-code change. It updates profiles and appends an audit event; it does not delete anything. A local pre-change snapshot and a check of all original row IDs were used for this update. The snapshot is ignored by Git and is not a substitute for the documented production encrypted backups.

## Timetable planning and class workbooks

Create subjects in Academics with Academic, Sport, Event or Non-academic categories. Assign active teachers with appropriate class access. All four categories can be selected in Timetable → Plan or import weekly timetables.

Set school starts/ends, assembly minutes, number of lunch breaks, minutes per break and period length. Select weekdays, classes/sections and subjects. Generate preview randomizes ties and prefers less-used subjects while selecting available assigned teachers. It reserves assembly and evenly spaced lunch breaks outside teaching slots. Remaining minutes at dismissal are not expanded into a partial period.

Every generated teaching period has an assigned teacher. Existing weekly class/teacher/room bookings are checked. If staffing is insufficient, the planner explains the blocked slot and saves nothing. It never creates a teacher-free period or overwrites an existing timetable. Review the draft and Save reviewed timetable to append the entire batch atomically. The planner has a bounded search and a 2,000-period batch limit; it does not guarantee solving arbitrary schedules or enforce subject quotas, teacher workload contracts or cross-school travel. Add teachers, revise selections or work in smaller groups when infeasible.

For manual planning, select a class and Download class timetable Excel. Fill each row's Subject and Teacher email from Assignments, keeping Day, Start/End (`HH:mm` plain text) and Class metadata intact. Numeric weekdays 1–7 represent Monday–Sunday. Upload and preview, then save. Filled periods must use assigned active teachers and pass the same overlap validation. The workbook is limited to 1 MB and 500 periods. Existing periods remain intact, and future substitutions must be reviewed before changing weekly schedules. Weekly timings are saved with generated batches and offered on reopening the planner.

## Yearly fees

Fees → Plan fees for the academic year: choose a year-linked class, fee name, monthly amount, currency, one recurring due day and charge months. Select entire academic year selects every month overlapping the year. Short months use their last day. Each resulting due date must be within the academic year's start/end boundaries.

Optionally assign the plan immediately to all currently active students in that class. All monthly schedules and charges are created in one transaction. A retry key prevents duplicate application; existing schedules with the same generated name are rejected without changing charges or payments. New admissions after planning can be assigned the already-created monthly schedules through the existing fee assignment controls. Existing one-time fee schedules remain available.

## Appearance

Calendar Excel tools, preview headings, agenda cards and holiday/event chips now have explicit readable dark-mode surfaces. The expanded timetable and fee planners use responsive layouts, accessible labels and shared light/dark colors. Browser checks cover expanded tools, contrast and mobile overflow as well as existing page scans.
