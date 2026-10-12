# Render + Aiven + R2 deployment and operating guide

Prepared 12 October 2026. This is the selected low-usage pilot architecture, not confirmation that the website is deployed. Existing local data must remain intact. Provider dashboards and allowances can change; verify the linked official documentation and your account's displayed limits before provisioning.

## Architecture and readiness

One Render Free Node web service serves the built React app and its API. Aiven Free MySQL holds accounts, school records and file metadata. A private R2 Standard bucket holds file bytes. Never use Render's ephemeral disk for permanent uploads or MySQL. Domain ownership does not include hosting or increase R2 allowances.

Already implemented: school/user authorization, private file endpoints, school/student storage quotas, login rate limiting, and crawler opt-out via robots.txt, HTML meta and X-Robots-Tag. These directives ask compliant crawlers to stay away; they are not access controls.

**Cloud implementation update:** private R2 storage, persistent transactional budgets, verified MySQL TLS, Render's one-hop proxy profile and offline migration tools are now implemented. Follow [RENDER-SETUP.md](RENDER-SETUP.md) and deploy/render.env.example for the exact supported configuration. Hosted scanning, actual-provider verification and complete cloud backup automation remain acceptance work; uploads default to disabled. The local production profile continues to require loopback; select the explicit Render profile instead of weakening validation.

No credentials, DNS record, provider subscription or cloud deployment was created by writing this guide. Budget enforcement activates only when the initialized cloud database and R2 runtime configuration are used. Storage/request reservations are cumulative with no automatic resets or refunds in the initial implementation; the monthly targets below describe provider allowances and future operator reconciliation, not an implemented monthly reset.

## Your next steps, in order

1. Create/sign in to Render and Aiven. Select their actual Free plans, not trials or paid plans. Do not authorize automatic paid upgrades.
2. In Aiven, create one Free MySQL service in an available region suitable for your schools. Record host, port, database, username and CA certificate privately. Store password in a protected secret manager or Render secret environment, never in Git or this chat. Do not assume provider default user has the restricted grants our runtime needs; verify compatible grants and MySQL features first.
3. Enable R2 in your Cloudflare account after reviewing its billing setup. Create a dedicated private Standard bucket such as schoolglass-private. Leave r2.dev and public custom-domain access disabled. Create bucket-scoped object read/write credentials for the backend; keep account-management credentials separate. Do not enable Infrequent Access, replication or optional paid features.
4. Tell me when those accounts/services exist. Share only the Render service name, Aiven region and R2 bucket name. Configure secrets directly in provider dashboards; do not paste passwords, API secrets, connection URLs containing credentials or backup keys into messages.
5. Complete the application changes listed above, validate against disposable cloud fixtures, and confirm the budget guards reject simultaneous uploads and survive restarts. Keep live file upload disabled until this passes and scanning is configured.
6. Create a Render Web Service from the connected School-Management GitHub repository, branch main, repository root. Proposed commands are `npm ci && npm run build` and `npm start`; final deployment environment must use the new hosted profile. Use the platform PORT and bind address, verified remote MySQL TLS, DATA_MODE=mysql, MYSQL_AUTO_MIGRATE=no, PUBLIC_APP_URL=https://schoolglass.jatinsinghrautela.com, no runtime bootstrap/recovery credentials, and private R2 secrets. These values are a plan, not a currently valid hosted configuration.
7. Preserve an encrypted backup of MySQL and local uploads. Use separate migration credentials to initialize a new target, then copy the existing data and verify original row identities, relationships and every file's checksum. Stop writes during final cutover; retain the local originals. Never initialize a demo database over existing data or delete the source after migration.
8. Add the custom domain in Render and follow its exact DNS target instructions in Cloudflare. Verify the certificate before enabling Cloudflare proxy. Configure the bot controls below, disable the default onrender.com address after custom-domain verification, and verify login, reset, imports, school isolation, uploads and downloads through HTTPS.
9. Start with dummy data/a small pilot. Complete PHASE-4.md and PILOT-ACCEPTANCE.md actual-host checks before real student data. Do not schedule synthetic traffic to keep a free service awake.

## Domain and certificate plan

Chosen names remain schoolglass.jatinsinghrautela.com, admin.schoolglass.jatinsinghrautela.com and api.schoolglass.jatinsinghrautela.com. All can initially point to the same Render service; separate hostnames do not create different authorization boundaries or owner-only authentication. The web app can use same-origin /api routes, avoiding unnecessary cross-origin requests.

On a normal full Cloudflare DNS setup, free Universal SSL covers the apex and first-level subdomains only. schoolglass.jatinsinghrautela.com can be proxied with that certificate. The deeper admin/api names cannot simply be orange-clouded with the same certificate. To keep zero additional certificate spending, add those custom domains to Render as DNS-only records and use Render's certificates, or initially use owner/API functionality through the main protected hostname. DNS-only addresses bypass Cloudflare bot defenses; protect/disable their public exposure before claiming all traffic is edge-filtered. A paid certificate option or alternate first-level names is a separate decision, not automatically enabled here.

Use Full (strict) TLS for proxied traffic after Render's certificate is issued. Do not use Flexible TLS. Do not cache /api responses, authenticated pages or private file bytes at a public edge cache.

## R2 budgets and controls

Standard free allowance: 10 GB-month storage, 1 million Class A operations and 10 million Class B operations per month. Egress is free, but read operations are metered. Extra Standard storage is $0.015/GB-month; additional A/B operation units cost $4.50/$0.36 per million, with billing-unit rounding. All buckets/services using the account share its allowance; this project cannot assume it owns all free usage.

Planned conservative project caps (subject to all-account usage):

| Control              | Initial target                           | Behavior                                                                     |
| -------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| Total object storage | 8,000,000,000 bytes (8 decimal GB)       | Reject new writes before crossing; preserve old files                        |
| Class A operations   | 500,000 per billing month                | Stop upload/list/reconciliation calls at limit                               |
| Class B operations   | 5,000,000 per billing month              | Stop cloud reads at limit; authenticated files show temporary unavailability |
| Warning thresholds   | 70%, 85%, 95% of project cap             | Show owner warning and review provider usage                                 |
| Per-file size        | Existing endpoint limits, typically 5 MB | Reject oversized files before cloud operations                               |

Adapter requirements: atomically reserve bytes and expected operations in MySQL before calling R2, including simultaneous users; count HEAD/LIST, multipart calls and bounded retries, not just button clicks. Persist counters across Render sleep/redeploys, align resets with the provider billing cycle, reconcile against provider usage and fail closed if accounting is uncertain. Account for replaced files, failed writes, pending multipart bytes and other clients. Never automatically delete school records/files to stay under a cap. Stop further storage expansion if another bucket consumes the buffer.

These are application protections, **not an R2 spending cap or a zero-bill guarantee**. Dashboard/manual uploads and other API clients bypass them; reads can cost money even when new uploads are blocked. R2 storage is charged for time retained: stopping Render or revoking a key does not remove existing storage charges if the stored quantity already exceeds the free allowance.

### Adjust, pause and resume R2

- Adjust the proposed project caps through protected backend configuration once implemented; reducing them below current usage should reject new operations, never delete files. Keep a margin and confirm all-account usage first. Existing SCHOOL_STORAGE_MB and STUDENT_STORAGE_MB cap school/student logical usage; they are not global R2 billing limits.
- For an immediate upload pause using today's supported configuration, set UPLOAD_SCAN_MODE=disabled and redeploy/restart. For a future all-R2-operation pause, use the adapter's planned global switch; until available, suspend Render and revoke the bucket token if necessary. Key revocation affects other clients using that key too.
- In Cloudflare R2/API tokens, revoke the dedicated token to block backend access, or rotate/create a replacement and update Render secrets to resume. There is no bucket power-off button. Token revocation does not delete files or revoke already-downloaded copies.
- Create budget alerts in Cloudflare Billing. They notify after usage-based spend reaches a monetary threshold; they do not stop usage and are not a pre-charge warning.
- Never delete the bucket to pause. If storage exceeds free allowance, back up and verify before deciding which files can be removed; deletion must be explicit and authorized.

## Bot and crawler protection

No public website can guarantee that nobody scans it, or that bot traffic is zero. robots.txt/noindex reduce compliant crawler traffic only; user-agent strings can be forged. Authorization prevents private data access but bots can still hit the login page.

1. Proxy the main supported hostname through Cloudflare. Enable free Bot Fight Mode and available AI-crawler blocking. Test every browser login, upload, password reset and API request afterward: bot challenges can interfere with legitimate clients, health checks and CSP. Do not weaken CSP blindly or challenge every API route. Bot Fight Mode cannot be bypassed with ordinary WAF skip rules.
2. Use available free custom security rules to block obvious scanner paths such as /wp-admin, /wp-login.php and /.env; do not block legitimate app routes based only on a bot user-agent. Review Security Events for false positives.
3. For your personal closed pilot, an IP allowlist or Cloudflare Access policy can further restrict the browser application. Confirm free-plan eligibility and configure approved users; Access may add another login and must not accidentally break later mobile access. Preserve Render health checks. This is optional, not silently enabled.
4. Disable Render's default onrender.com subdomain after a working custom domain is verified, otherwise attackers bypass Cloudflare. DNS-only deep aliases remain another bypass: restrict them or defer them as explained above. Origin host/source protection must be tested in the hosted profile, not inferred from DNS alone.
5. Keep R2 private. Never offer unsigned upload presets, public listing or permanent public URLs for private school documents. Issue downloads only after authorization and budget reservation; tightly bounded signed URLs, if introduced, are bearer links and can bypass per-request app counters until expiry.
6. Retain API/login rate limits; add hosted durable per-user/IP request and upload limits without trusting client-supplied forwarded headers. Bound retries. Do not run public load tests, automatic link scanners or keep-awake monitors. Manually review usage instead.

Cloudflare protection reduces origin traffic, not every billed operation. A public gallery can still generate legitimate reads. Cloud access does not replace malware scanning; keep uploads disabled until the hosted scanning approach is validated. Free Render resource limits may make a local ClamAV deployment impractical, so don't promise scanning fits before measuring it.

## Aiven limits and start/stop

Free MySQL currently includes 1 GB RAM and 1 GB storage on a single node, without high availability. Set application database warnings at 60%, 75% and 85% of the provider's measured storage, leaving space for indexes/logs/maintenance. File bytes belong in R2; do not put them in MySQL. Reject optional bulk growth when unsafe rather than filling the disk. Verify provider metrics; table sizes alone are not total billed storage. Keep connection pools modest and inspect the actual connection allowance.

- **Adjust:** use service settings/plan comparison, check whether a change costs money before confirming. Free storage is fixed; changing plans to obtain more space is not a free-limit adjustment. Provider disk alerts and application admission guards still need configuration/implementation.
- **Stop:** first suspend Render and verify all writers/migrations have stopped; take and verify an off-provider backup. In Aiven service Overview choose Actions > Power off service only after reading the confirmation. Power-off removes the virtual machines: if there are no provider backups, all service data is lost. Verify recovery support for the Free plan first; without it, only proceed with an explicitly planned restore from your own verified backup. This is not a safe reversible pause by default.
- **Start:** choose Power on, wait for Running, recheck endpoints/TLS/credentials and data, then resume Render. Do not delete/recreate the service to restart it.
- Free services may be powered off for inactivity. Watch Aiven email/dashboard notices. Don't generate artificial traffic to avoid provider inactivity policies. Back up independently before relying on a free service.

## Render limits and start/stop

Free web services sleep after 15 minutes idle and have ephemeral disks. Current free instance-hour allowance is shared across workspace services; bandwidth/build allowances are also shared and must be checked in Billing/Usage. Prefer one service for both web and API. Render outbound traffic to R2/Aiven and file bytes streamed to users can consume Render bandwidth even though R2 egress is free. Free services can be suspended for unusual service-initiated external traffic; validate this architecture with light usage.

- **Adjust:** select Free instance type; inspect workspace allowances/spend settings before any upgrade. Use manual deploys if frequent Git pushes waste build minutes. Set PORT via Render, not a development frontend port. Do not enable extra paid services or paid persistent disks.
- **Stop:** service Settings/Suspend service, confirm suspension; this stops the app, not its external database/storage billing. Preserve custom domains and secrets. Deleting a service is not a pause.
- **Start:** resume the suspended service, wait for deploy/readiness and inspect logs. For an active app restart use the dashboard restart/manual-deploy action available for your service; redeploys discard local filesystem data. Verify database and R2 availability first.
- For complete pause: disable writes, verify backup, suspend Render, then consider database power-off only with recovery safeguards. For resume: Aiven first, verify R2 token, Render last. DNS alone is not a service stop.

## Before and after launch checklist

- No secrets in Git/logs/browser bundles. R2 bucket-scoped credentials, verified Aiven TLS, restricted runtime database account, separate migrations.
- Original local database/files retained; remote identity/checksum comparison complete; encrypted off-provider backup and test restore.
- Cloud limits active and tested at boundaries/concurrency, with owner warnings; low free-tier limits confirmed in dashboards.
- Hosted proxy/header/auth/CSP behavior tested, Cloudflare origin bypass checked, no public private files or cache leakage.
- School/student/guardian roles and archived schools verified over HTTPS; uploads scanned or disabled; email disabled until delivery works.
- Review provider usage weekly and after imports/galleries. No automated production load testing. Stop service if anomalous traffic appears, preserve evidence/data, rotate exposed credentials and investigate before resuming.

## Official references

- [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [R2 API tokens](https://developers.cloudflare.com/r2/api/tokens/), [budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/).
- [Render free limits](https://render.com/docs/free), [custom domains and disabling default subdomain](https://render.com/docs/custom-domains), [outbound bandwidth](https://render.com/docs/outbound-bandwidth).
- [Aiven MySQL Free](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier), [power-cycle and recovery behavior](https://aiven.io/docs/products/mysql/howto/power-cycle-service).
- [Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/), [Universal SSL limitations](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/).
