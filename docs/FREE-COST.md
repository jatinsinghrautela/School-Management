# Zero-cost policy

Checked 8 October 2026. No paid dependency, external AI API, payment service, SMS integration, or cloud account is required to develop or run this project locally.

## Reliable zero-new-investment development

Run React, Node, MySQL Community and Git on an existing computer. The software is free; hardware, electricity and existing connectivity are assumed. Docker Desktop is optional and its commercial licensing eligibility must be checked by organizations; use MySQL Community directly if needed. The interface uses system fonts and original SVG assets.

Yearly calendar workbooks use the free MIT-licensed [ExcelJS runtime](https://github.com/exceljs/exceljs). No external spreadsheet API or Microsoft subscription is required; free LibreOffice can edit the `.xlsx` template. ExcelJS runs in Node, keeping spreadsheet code out of the browser bundle. A pinned UUID override supplies its patched transitive dependency.

## Hosting reality

Free managed hosting is quota-based and can change. Do not add a credit card, enable paid overages or subscribe without an explicit budget decision. A public multi-school production service with backups, uptime and a persistent MySQL database cannot be guaranteed to cost nothing indefinitely.

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/): useful for a static React frontend on a provider subdomain. It does not itself supply a conventional Node server plus MySQL.
- [Render free services](https://render.com/docs/free): free web services sleep after 15 minutes without inbound traffic; the filesystem is ephemeral. Free PostgreSQL expires, and PostgreSQL is not MySQL. Do not run persistent MySQL on ephemeral free storage.
- Existing infrastructure may host Node/MySQL, but publicly exposing a personal computer is a separate security and availability decision.
- PDFKit generates report PDFs locally. Nodemailer uses an optional existing school SMTP mailbox; ClamAV scans uploads on the same machine. No hosted email or scanning subscription is connected. Email and uploads stay disabled until configured. Existing infrastructure availability and operating costs belong to the school; no promise of unlimited free SMTP is made. SMS, WhatsApp and push remain future work.

Recommended path: local development → local synthetic-data pilot → choose hosting after measuring usage and checking available free offers. Keep deployment optional and avoid promising a production SLA on a free tier.

Mobile initially uses a PWA or Android APK. Store distribution costs and account requirements must be checked at that time; they are not included in the zero-cost promise.
