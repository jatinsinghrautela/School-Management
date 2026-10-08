# Yearly calendar Excel workflow

School directors, admins and principals open **Timetable → Plan yearly calendar**.

1. Choose a calendar year (2000–2100), Sunday holidays and a Saturday rule. Sundays default to off. Saturday choices are none, all, second and fourth, second only, or fourth only. A fifth Saturday is working unless all Saturdays are off.
2. Download the formatted `.xlsx` template. It includes every date, weekdays and prefilled holidays based on those choices. The workbook has frozen headers, date formats, filters, readable column widths and a Status dropdown.
3. In **Year calendar**, edit Status, Title and Details. Use Working, Holiday or Event. Holiday/Event requires a title. Working dates do not publish titles or notes. Keep every date, its weekday, the column layout and the Settings sheet. Excel or free LibreOffice can edit the file; no Microsoft subscription is required by the website.
4. Save as `.xlsx`, upload it on Timetable, review every date and the added/edited/cancelled counts, then select **Apply reviewed year calendar**. The preview lasts 15 minutes and is specific to the school and administrator. If someone changes the calendar, upload again to review current changes.
5. Open **Calendar** to see the whole-school holidays and events. Re-uploading updates the same date entries instead of duplicating them. Marking an imported date Working cancels that Excel-managed entry and retains its record. Manually created calendar entries are preserved.

The rows are authoritative: changing Settings preferences inside Excel does not recalculate them. Generate a new template to change the weekend defaults. A template is school-specific; uploads from another school, incomplete years, duplicated dates, formulas, invalid statuses and oversized/unsupported archives are rejected with row errors. Maximum upload size is 1 MB, with a 5 MB expanded archive limit.

This workflow imports **all-day, whole-school calendar entries**, not weekly teaching periods. Holidays do not yet block attendance or override weekly timetables. Excel uploads allow one holiday/event per date; use the Calendar editor for additional or class-specific events.

Pending release work includes background import processing, expired-preview cleanup and normalized/indexed storage. Only synthetic records should be used until the release checks in PLAN.md are complete.
