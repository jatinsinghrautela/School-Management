# Zero-cost policy

Checked 8 October 2026. No paid dependency, external AI API, payment service, SMS integration, or cloud account is required to develop or run this project locally.

## Reliable zero-new-investment development

Run React, Node, MySQL Community and Git on an existing computer. The software is free; hardware, electricity and existing connectivity are assumed. Docker Desktop is optional and its commercial licensing eligibility must be checked by organizations; use MySQL Community directly if needed. Fonts currently load from Google Fonts with local sans-serif fallback; self-host licensed font files for fully offline use.

## Hosting reality

Free managed hosting is quota-based and can change. Do not add a credit card, enable paid overages or subscribe without an explicit budget decision. A public multi-school production service with backups, uptime and a persistent MySQL database cannot be guaranteed to cost nothing indefinitely.

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/): useful for a static React frontend on a provider subdomain. It does not itself supply a conventional Node server plus MySQL.
- [Render free services](https://render.com/docs/free): free web services sleep after 15 minutes without inbound traffic; the filesystem is ephemeral. Free PostgreSQL expires, and PostgreSQL is not MySQL. Do not run persistent MySQL on ephemeral free storage.
- Existing infrastructure may host Node/MySQL, but publicly exposing a personal computer is a separate security and availability decision.
- Use built-in print-to-PDF and in-app notices initially. SMS, WhatsApp, email delivery and push must be selected only after checking real free limits and long-term availability. No service is currently integrated.

Recommended path: local development → local synthetic-data pilot → choose hosting after measuring usage and checking available free offers. Keep deployment optional and avoid promising a production SLA on a free tier.

Mobile initially uses a PWA or Android APK. Store distribution costs and account requirements must be checked at that time; they are not included in the zero-cost promise.
