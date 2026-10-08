# Yearly calendar Excel workflow

School directors, admins and principals open **Calendar → Plan yearly calendar**.

1. Choose a calendar year (2000–2100), Sunday holidays and a Saturday rule. Sundays default to off. Saturday choices are none, all, second and fourth, second only, or fourth only. A fifth Saturday is working unless all Saturdays are off. Choose Include/Exclude public holidays, country, and an optional state/province and region. The default location is India; choose the school's actual location before download.
2. Download the formatted `.xlsx` template. It includes every date, weekdays and prefilled holidays based on those choices. The workbook has frozen headers, date formats, filters, readable column widths and a Status dropdown.
3. In **Year calendar**, edit Status, Title and Details. Use Working, Holiday or Event. Holiday/Event requires a title. Working dates do not publish titles or notes. Keep every date, its weekday, the column layout and the Settings sheet. Excel or free LibreOffice can edit the file; no Microsoft subscription is required by the website.
4. Save as `.xlsx`, upload it on Calendar, review every date and the added/edited/cancelled counts, then select **Apply reviewed year calendar**. The preview lasts 15 minutes and is specific to the school and administrator. If someone changes the calendar, upload again to review current changes.
5. Open **Calendar** to see the whole-school holidays and events. Re-uploading updates the same date entries instead of duplicating them. Marking an imported date Working cancels that Excel-managed entry and retains its record. Manually created calendar entries are preserved.

The rows are authoritative: changing Settings preferences inside Excel does not recalculate them. Generate a new template to change the weekend defaults. A template is school-specific; uploads from another school, incomplete years, duplicated dates, formulas, invalid statuses and oversized/unsupported archives are rejected with row errors. Maximum upload size is 1 MB, with a 5 MB expanded archive limit.

This workflow imports **all-day, whole-school calendar entries**, not weekly teaching periods. Applied active holidays block both attendance write endpoints and the attendance forms. Existing records on those dates remain in history, with an exclusion label, and do not count in dashboard attendance percentages. Templates and unconfirmed previews do not close attendance. Cancel/edit the active holiday, or import its date as Working, to reopen the date (any remaining manual holiday also needs updating). Weekly timetables are not yet overridden. Excel uploads allow one holiday/event per date; use the Calendar editor for additional or class-specific events.

Pending release work includes background import processing, expired-preview cleanup and normalized/indexed storage. Only synthetic records should be used until the release checks in PLAN.md are complete.

## Public-holiday coverage and attribution

Holiday references use the offline [date-holidays dataset](https://github.com/commenthol/date-holidays) (ISC code, CC BY-SA 3.0 data). Its country files record their attribution; links and license information are included in Settings and the interface. Only public holiday rules are included, not optional/observance/bank-only rules. India 2026 additionally includes the central gazetted dates published by [NIEPVD, Government of India](https://niepvd.nic.in/gazetted-holiday-2026/), checked 8 October 2026. Country-level holidays and regional additions may not represent every school's closure policy. Other Indian years may need additional festival dates; confirm government/school circulars, including lunar and newly announced dates.

Include marks supported public-holiday dates Holiday. Exclude retains the names in workbook Details without making them days off; weekend rules still apply. The Settings sheet preserves location and preference choices. Version-one templates remain accepted and preserve their rows. Changing Settings inside Excel never recalculates the date rows.
