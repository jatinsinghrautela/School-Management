# Schoolglass Desk — complete deployment and maintenance guide

Updated 12 October 2026. This is the consolidated guide for the live installation: setup, migration, DNS, updates, limits and recovery. Never put credentials or backup passphrases into this file or Git.

## 1. Current installation

| Component | Configuration                                                    |
| --------- | ---------------------------------------------------------------- |
| Website   | https://schoolglass.jatinsinghrautela.com                        |
| Render    | schoolglass-desk; Free Node web service; Singapore               |
| GitHub    | https://github.com/jatinsinghrautela/School-Management.git; main |
| Database  | Aiven MySQL mysql-34b5a0a4; DigitalOcean Singapore               |
| Files     | Cloudflare R2 private Standard bucket schoolglass-private        |
| DNS       | jatinsinghrautela.com on Cloudflare Free                         |

One Render service serves the built React frontend and Node API. It connects to MySQL with verified TLS and reads private R2 objects through authorized application routes. Your PC and Docker are no longer required to host the live website.

Completed migration: 486 verified database rows, 3 schools, 34 users and five checksum-verified files. Existing password hashes were preserved; prior sessions/reset tokens were revoked. Local database and uploads were retained. The encrypted local cutover backup is historical and does not contain subsequent cloud changes.

Live checks passed: Render homepage, MySQL health, readiness, unauthorized API rejection and crawler opt-out. The custom domain returned HTTPS 200 and readiness 200 through Cloudflare. The owner confirmed Render domain verification. Full (strict), Bot Fight Mode, Render subdomain disabling and Auto-Deploy settings have not been independently inspected; confirm them below. Login/role/private-file user acceptance still requires testing.

## 2. Will keeping everything running cost money?

Low usage can remain at $0 additional hosting cost. Domain renewal is separate. Free allowances are conditional, and usage outside them or optional paid products can incur charges. Review the actual account dashboards; other projects share allowances.

| Service                   | Free allowance / constraint                                                    | Practical effect                                                               |
| ------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Render                    | Free compute; 750 instance hours/workspace/month; sleeps after 15 idle minutes | First visit after sleep may take about a minute; monitor bandwidth/build usage |
| Aiven MySQL Free          | 1 GB storage, 1 GB RAM, 1 CPU                                                  | Monitor database growth and inactivity notices; stay on Free                   |
| R2 Standard               | 10 GB-month, 1 million Class A and 10 million Class B operations/month         | Overages are metered across the account                                        |
| Cloudflare Free DNS/proxy | Free plan                                                                      | Optional paid security/certificate features are separate                       |

Render suspends Free services if shared free hours run out. Bandwidth/build overages can be billed with a payment method; without one, services/builds are restricted. Set a $0 pipeline spend limit where available; this does not cap bandwidth. Read Billing for current included bandwidth/build quantities. Heavy service-initiated database/storage traffic can also cause suspension. Normal SMTP ports are blocked on Free, so adding mailbox credentials alone does not enable our disabled email delivery. [Render Free](https://render.com/docs/free), [pipeline limits](https://render.com/docs/build-pipeline), [bandwidth](https://render.com/docs/outbound-bandwidth).

Aiven Free has no fixed expiry but may be powered off for inactivity. Monitor storage and do not accept a paid upgrade without reviewing it. [MySQL pricing](https://aiven.io/pricing/mysql), [free-service policy](https://aiven.io/docs/platform/concepts/service-pricing).

R2 Standard overage: $0.015/GB-month storage, $4.50/million Class A and $0.36/million Class B, subject to billing-unit rounding. R2 egress is free; Render delivery bandwidth is a separate meter. The allowance is account-wide, not per bucket. Infrequent Access has different charges and no Standard free allowance. [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

Do not schedule keep-awake pings, constant probes or live capacity tests. Review provider usage weekly initially and before quota changes. Bot protection reduces unwanted traffic; it cannot guarantee zero bots or zero cost. Application R2 caps are not a provider-wide billing hard stop.

## 3. Source and accounts

1. Keep package.json and package-lock.json committed to GitHub. Use Node 24 for this release.
2. Never commit .env, private data, backups or generated login spreadsheets. Private operator configurations currently reside under ignored apps/api/data.
3. Keep local development separate from cloud operator credentials. Do not develop against live student records.
4. Select actual Free plans, not paid trials, paid disks/workers or R2 Infrequent Access. Check billing notifications and available spend controls.
5. Permanent records belong in Aiven and file bytes in R2. Render's disk is disposable.

## 4. Aiven database setup

For the current installation, retain mysql-34b5a0a4. Do not recreate it or repeat migration.

For a new installation:

1. Create a MySQL Free service and wait for Running.
2. Copy connection host, port, database and administrator credentials privately. The service name is not the connection hostname.
3. Download the CA certificate to apps/api/data/aiven-ca.pem. Later add its contents to Render as a secret file.
4. Use separate privileged migration credentials. After schema/import, create a restricted runtime user with a random password at least 20 characters.
5. Runtime grants allow application data operations, only SELECT/INSERT on audit, SELECT on migration/legacy records, and SELECT/UPDATE on sg_cloud_budget. No runtime DDL. The project grant generator expects an exact host; remote Aiven host handling may require administrator-reviewed adjustment. Do not blindly substitute a wildcard or use avnadmin at runtime.
6. Find Render's outbound IP ranges in its service information. Add required ranges to Aiven's allowlist, plus an operator IP temporarily during maintenance. Test before removing broad access. Initial setup used an open allowlist; confirm/tighten the live setting separately.
7. Require TLS CA and hostname validation even with IP restrictions. Never set NODE_TLS_REJECT_UNAUTHORIZED=0.

## 5. R2 setup

1. Cloudflare → Storage & databases → R2 → Overview; enable the subscription after reviewing billing/payment requirements.
2. Create Standard bucket schoolglass-private. Keep public r2.dev and public custom-domain access disabled.
3. R2 API tokens → Create Account API token → Object Read & Write → restrict to this bucket.
4. Save the generated S3 Access Key ID and Secret Access Key privately. These are distinct from general Cloudflare account-management tokens.
5. Copy the account HTTPS S3 endpoint. Do not use a public bucket URL or r2.dev address.
6. Add these values only to the backend environment. Keep the bucket/token exclusive to this application; other clients/dashboard operations bypass our counters.

## 6. Initial migration — already completed

This procedure is for an EMPTY replacement target only. Never run it against the existing live database or restore the old snapshot over current school data.

1. Stop source API/workers, keeping local MySQL and uploads. With LOCAL credentials, a private BACKUP_PASSPHRASE and BACKUP_MAINTENANCE_CONFIRMED=yes, run npm run backup:create, then npm run backup:verify -- <backup-file>. The offline migration format is limited to 128 MB; larger datasets need a designed streaming process.
2. Switch to separate target operator credentials with MYSQL_TLS=required and a local MYSQL_CA_FILE. Set CLOUD_MIGRATION_CONFIRMED=yes and the backup passphrase. From apps/api run node src/cloud-import.js <absolute-backup-file>. It initializes schema, refuses existing target data, compares migration versions, verifies imported rows, revokes old tokens and initializes the persistent budget.
3. Configure target R2 with FILE_STORAGE=r2. Keep original local uploads available and run node src/migrate-cloud-files.js from apps/api. Conditional writes prevent overwrites; size/SHA-256 checks verify bytes. Identical existing objects are accepted on retry; conflicts stop the process. Local originals are not deleted.
4. Verify all rows/files, create the restricted runtime account and apply reviewed grants. Keep privileged migration secrets out of Render.
5. Build and run npm run deploy:check -- --database in an isolated runtime environment. For operator validation set RENDER=true and use the local certificate path. Render supplies its own RENDER value and secret-file path later.
6. Preserve local originals and the verified backup. After cutover the cloud contains current writes; old local copies do not synchronize automatically.

Private local files used here: apps/api/data/local-backup.env, cloud-migration.env and render-runtime.env. Load the appropriate file privately; never print or commit its contents. The historical backup is apps/api/data/backups/2026-10-12T17-34-03.445Z-bbfd9be1-00fc-4779-bbe4-458651e91cba.sgbackup.

## 7. Render setup, including all environment variables

1. Render → New → Web Service; connect GitHub and select School-Management.
2. Name schoolglass-desk; branch main; Node runtime; Singapore; Free instance. Leave Root Directory blank.
3. Build command: npm ci --include=dev && npm run build.
4. Start command: npm start.
5. Health Check Path: /api/ready. Leave Pre-Deploy Command blank. Keep automatic schema migrations disabled.
6. Initially choose Auto-Deploy Off for controlled cutover. Section 10 explains automatic updates.
7. Add the following variables. Replace placeholders with private actual values, not the literal placeholder text.

| Variable             | Value                                     |
| -------------------- | ----------------------------------------- |
| NODE_ENV             | production                                |
| DEPLOYMENT_PROFILE   | render                                    |
| HOST                 | 0.0.0.0                                   |
| TRUST_PROXY          | 1                                         |
| DATA_MODE            | mysql                                     |
| MYSQL_HOST           | <Aiven hostname>                          |
| MYSQL_PORT           | <Aiven port>                              |
| MYSQL_DATABASE       | <migrated database>                       |
| MYSQL_USER           | <restricted runtime account>              |
| MYSQL_PASSWORD       | <runtime password>                        |
| MYSQL_AUTO_MIGRATE   | no                                        |
| MYSQL_TLS            | required                                  |
| MYSQL_CA_FILE        | /etc/secrets/aiven-ca.pem                 |
| PUBLIC_APP_URL       | https://schoolglass.jatinsinghrautela.com |
| FILE_STORAGE         | r2                                        |
| R2_ENDPOINT          | <HTTPS account S3 endpoint>               |
| R2_BUCKET            | schoolglass-private                       |
| R2_ACCESS_KEY_ID     | <bucket-scoped S3 access key>             |
| R2_SECRET_ACCESS_KEY | <S3 secret>                               |
| R2_MAX_BYTES         | 8000000000                                |
| R2_MAX_CLASS_A       | 500000                                    |
| R2_MAX_CLASS_B       | 5000000                                   |
| R2_PAUSED            | no                                        |
| UPLOAD_SCAN_MODE     | unscanned                                 |
| SCHOOL_STORAGE_MB    | 250                                       |
| STUDENT_STORAGE_MB   | 20                                        |

8. Add Secret File aiven-ca.pem, containing the downloaded CA certificate. No client private key is needed for this configured connection.
9. Let Render supply PORT and RENDER. Do not add bootstrap/recovery passwords, backup passphrases or migration/admin credentials. Email stays disabled until a supported delivery configuration is implemented/tested.
10. Click Create Web Service after migration/preflight succeeds. Wait for build and Live. Inspect logs and /api/ready; test the website.
11. The Linux optional dependency failure was fixed in commit fa28412. Retain the updated package-lock and root optional dependencies. Use Clear build cache & deploy if an old cached build still reports missing Rollup/esbuild Linux binaries.

## 8. Domain, HTTPS and bot protection

1. Render → service Settings → Custom Domains → add schoolglass.jatinsinghrautela.com.
2. Cloudflare zone jatinsinghrautela.com → DNS → Records → CNAME: Name schoolglass; Target schoolglass-desk.onrender.com; TTL Auto; DNS only initially. Do not include https:// in the target.
3. Resolve conflicts only for this hostname; do not remove unrelated email/root-domain records.
4. Verify in Render and wait for its certificate. Test HTTPS, then switch the CNAME to Proxied. Set SSL/TLS to Full (strict), not Flexible. [Official Render DNS instructions](https://render.com/docs/configure-cloudflare-dns).
5. Do not apply public Cache Everything rules to authenticated pages, /api or private file responses. API responses already use private/no-store.
6. Enable free Bot Fight Mode in Cloudflare security settings; enable AI crawler blocking if available. Test login/imports/downloads afterward. These controls affect the zone and other hosted sites. Inspect Security Events if legitimate requests are challenged; Free Bot Fight Mode cannot be selectively bypassed by ordinary skip rules. [Bot Fight Mode guide](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/).
7. After custom-domain user flows pass, Render → Settings → Custom Domains → Render Subdomain → Disabled. This closes the default address around Cloudflare. [Render custom domains](https://render.com/docs/custom-domains).
8. The app includes robots.txt disallow-all, noindex metadata and X-Robots-Tag. These discourage compliant indexing, not hostile traffic.
9. Owner login and /api use the same main hostname. Defer admin.schoolglass.jatinsinghrautela.com and api.schoolglass.jatinsinghrautela.com: normal Free Universal SSL does not cover deeper subdomains. DNS-only aliases would bypass Cloudflare protection. [Certificate limitations](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/).

Verify actual forwarded client IP/protocol before IP-specific controls: TRUST_PROXY=1 assumes Render's edge, and Cloudflare adds another layer. Never switch to unrestricted TRUST_PROXY=true to bypass validation.

## 9. R2 caps and how to adjust them

The app atomically reserves usage in MySQL sg_cloud_budget before R2 calls. Current maximums: 8 decimal GB reserved bytes, 500,000 Class A and 5,000,000 Class B operations. Counters survive redeploy/sleep. Private downloads are bounded; SDK retries are disabled; conditional PUT prevents replacing an object.

Counters are cumulative, NOT monthly. Failed writes/deletions do not refund reserved bytes. This conservative approach can block use early. There is no automatic warning dashboard or reset. Other clients/dashboard activity are uncounted by the app. Do not delete the budget table/row to create a fresh allowance.

Inspect using an authorized read-only SQL connection with verified TLS:

```sql
SELECT * FROM sg_cloud_budget WHERE id = 1;
```

Edit R2_MAX_BYTES / R2_MAX_CLASS_A / R2_MAX_CLASS_B in Render Environment, then save and deploy. Lower caps are allowed; caps below already reserved usage block further relevant calls. Values above the listed conservative maxima are rejected by current code and require reviewed implementation/cost changes.

At a cap, reconcile provider usage and billing period first. Privileged counter adjustments require maintenance, a backup and an audit note. Never reset bytes to zero while objects remain. A/B period adjustments require checking account-wide usage, not blindly resetting at the calendar month. Alerts are not guaranteed billing caps.

| Need                     | Setting / action                            | Effect                                                |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------- |
| Stop new uploads         | UPLOAD_SCAN_MODE=disabled; save and deploy  | Existing authorized reads remain                      |
| Stop all app R2 calls    | R2_PAUSED=yes; save and deploy              | Reads/uploads stop; objects retained                  |
| Resume R2                | R2_PAUSED=no; save and deploy               | Existing caps remain                                  |
| Resume unscanned uploads | UPLOAD_SCAN_MODE=unscanned; save and deploy | No antivirus; existing access/type/size checks remain |
| Compromised token        | Revoke token; rotate Render credentials     | Objects retained; app needs new key                   |

Pausing does not stop stored-byte charges or other clients. Do not enable public access or delete records/files to fix a warning.

## 10. Will code changes deploy automatically?

Saving local files does not update the website. Render builds GitHub commits from main. Data entered through the website is saved directly in Aiven/R2 without a Git release.

Our setup prescribed Auto-Deploy Off; inspect the actual dashboard setting. Manual update workflow:

1. Develop/test against separate local data. Run appropriate checks, normally npm test and npm run build. Review git diff and never stage secrets/data directories.
2. Commit only intended files and push/merge to GitHub main.
3. Render → Manual Deploy → Deploy latest commit. Clear build cache only when needed.
4. Watch logs, confirm live commit and test readiness/changed flows on the custom domain. Do not reimport school data.

To automate: Render → Settings → Auto-Deploy → On Commit → Save. Pushed/merged main commits then trigger builds. Prefer After CI Checks Pass when GitHub Actions reliably pass; it requires detected passing checks. Unmerged branches/local-only commits do not deploy. Builds consume usage. [Render auto-deploy and release behavior](https://render.com/docs/deploys).

Documentation-only commits may include [skip render] to avoid an unnecessary build; this guide's commit uses it. Save environment changes using the deployment option. Restart service reuses the deployed configuration and is not a substitute for deploying changed environment values.

Schema changes need a separate reviewed migration: current cloud backup, tested compatibility, maintenance where needed, privileged migration and updated runtime grants before compatible code release. Keep MYSQL_AUTO_MIGRATE=no. Normal code updates must never restore the old cutover snapshot over live data.

Rollback a bad release using Render's available previous deploy only after database compatibility review. Code rollback does not reverse schema/data changes. Keep the known working commit and verified backups.

## 11. Stop/start services safely

| Component | Stop                                                                                  | Resume / cautions                                                    |
| --------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Render    | Settings → Suspend service                                                            | Resume, then check readiness/logs; do not delete it                  |
| R2        | App pause settings in section 9                                                       | Resume/redeploy; storage is retained, not a running process          |
| Aiven     | Prefer leaving Free database running; before power-off make a verified current backup | Console power-on, verify connection/certificate/grants and readiness |
| PC/Docker | Can shut down after cloud cutover                                                     | Required only for local development/maintenance                      |

Never delete the Aiven service, R2 bucket/files, Docker volume or school records as a pause action. Read Aiven's power-off warning and actual backup availability first; do not assume data will survive a power-off/delete. Resume database first, then application/storage, then user checks. Update runtime secrets if connection details change.

## 12. Cloud backups and malware scanning

The historical local migration backup is not current cloud protection. Existing local backup commands assume local disk/table layout and must not be claimed as complete R2/cloud backup. Automated full cloud backup/recovery remains future work.

For current protection, export a consistent full MySQL database INCLUDING sg_cloud_budget and independently back up referenced R2 objects. Coordinate a writer pause or designed consistent snapshot. Encrypt/protect backups, record timestamps/row counts/file hashes, keep them outside the live provider/bucket and test restoring into a disposable target. Preserve budgets on restore. R2 copying/checking consumes usage; budget it. Git stores source, not school data.

The owner authorized UPLOAD_SCAN_MODE=unscanned. No scanner is installed; files are recorded as unscanned, not clean. Access/type/size/dimension/quota checks remain. ClamAV is free software but standard signatures are impractical on Render Free. Later provision a suitable scanner, configure CLAMAV_COMMAND and optional CLAMAV_DATABASE_DIR, update signatures, test with EICAR in an isolated environment, then set required and deploy. Changing modes does not scan historical files. disabled stops new uploads; unscanned-local is not a production mode.

## 13. Troubleshooting and acceptance

| Symptom                     | Check                                                               |
| --------------------------- | ------------------------------------------------------------------- |
| Slow first request          | Allow service to wake; do not add keep-awake pings                  |
| DB startup failure          | Aiven running, IP allowlist, host/port, grants and certificate path |
| TLS failure                 | Correct CA/hostname; do not disable verification                    |
| Rollup Linux binary missing | Updated lockfile/dependencies; clear cache and deploy latest        |
| Login failure               | Re-login after migration; preserved password, account status, logs  |
| Files unavailable           | R2 pause, caps, token/bucket and metadata; preserve data            |
| Upload blocked              | Scan mode, quota/type/size/counters; required needs scanner         |
| Cloudflare 403/challenge    | Security Events and bot controls; test UI/API                       |
| Old UI                      | GitHub main, Auto-Deploy setting and live commit                    |
| Service suspended           | Provider notification, usage/billing; do not auto-upgrade           |

Remaining acceptance checks:

- Confirm actual Free plans, billing notifications and pipeline spend limit.
- Confirm Full (strict), main domain proxied, bot settings and private R2.
- Test login/logout, school/role isolation, imports and required password changes.
- Test existing/new logos, gallery, documents and private downloads with small dummy files.
- Disable default Render subdomain after these flows work.
- Tighten Aiven allowlist after connectivity verification.
- Establish/test current cloud backups; complete privacy/recovery requirements before real-school reliance.

## Official references

- [Render Free](https://render.com/docs/free)
- [Render deployments](https://render.com/docs/deploys)
- [Render pipeline](https://render.com/docs/build-pipeline)
- [Render bandwidth](https://render.com/docs/outbound-bandwidth)
- [Render Cloudflare DNS](https://render.com/docs/configure-cloudflare-dns)
- [Render custom domains](https://render.com/docs/custom-domains)
- [Aiven MySQL pricing](https://aiven.io/pricing/mysql)
- [Aiven service pricing/free policy](https://aiven.io/docs/platform/concepts/service-pricing)
- [R2 setup](https://developers.cloudflare.com/r2/get-started/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/)
- [Cloudflare certificate limitations](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/)
