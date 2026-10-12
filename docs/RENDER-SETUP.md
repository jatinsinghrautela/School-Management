# Render cloud pilot: configuration and cutover

Historical configuration reference. Use [CLOUD-DEPLOYMENT.md](CLOUD-DEPLOYMENT.md) as the current consolidated guide: migration and deployment are complete and custom-domain HTTPS/readiness passed. Earlier statements below about providers not yet accessed or data not yet migrated describe the pre-cutover state.

Upload policy update: the owner explicitly authorized hosted pilot uploads without scanning. Use `UPLOAD_SCAN_MODE=unscanned` in Render. Earlier disabled-until-scanning instructions below describe the safe alternative: `disabled` stops uploads, `required` enables real configured ClamAV. No hosted scanner is installed. Existing unscanned files are not retroactively scanned by changing the mode.

12 October 2026. Cloud code is implemented and locally verified. Your Aiven/R2 accounts have not been accessed by this agent; actual provider verification and migration remain operator steps. No existing local data has been moved or deleted.

## Render form

Repository: School-Management; branch main; runtime Node; root blank; region Singapore; instance Free. Build: `npm ci --include=dev && npm run build`. Start: `npm start`. Health: `/api/ready`. Pre-deploy blank, auto-deploy Off. Do not start the service against an empty database or add automatic schema migrations.

Use deploy/render.env.example as the exact runtime variable checklist. Render supplies PORT and RENDER=true. Add these in Render's Environment section:

| Variable                                 | Value                                                              |
| ---------------------------------------- | ------------------------------------------------------------------ |
| NODE_ENV                                 | production                                                         |
| DEPLOYMENT_PROFILE                       | render                                                             |
| HOST                                     | 0.0.0.0                                                            |
| TRUST_PROXY                              | 1                                                                  |
| DATA_MODE                                | mysql                                                              |
| MYSQL_HOST / MYSQL_PORT / MYSQL_DATABASE | Actual Aiven connection values, not the service name               |
| MYSQL_USER / MYSQL_PASSWORD              | Restricted runtime account; unique password at least 20 characters |
| MYSQL_AUTO_MIGRATE                       | no                                                                 |
| MYSQL_TLS                                | required                                                           |
| MYSQL_CA_FILE                            | /etc/secrets/aiven-ca.pem                                          |
| PUBLIC_APP_URL                           | https://schoolglass.jatinsinghrautela.com                          |
| FILE_STORAGE                             | r2                                                                 |
| R2_ENDPOINT                              | Account's HTTPS S3 endpoint, not r2.dev or a bucket URL            |
| R2_BUCKET                                | schoolglass-private                                                |
| R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY  | Bucket-scoped Object Read & Write credentials                      |
| R2_MAX_BYTES                             | 8000000000                                                         |
| R2_MAX_CLASS_A                           | 500000                                                             |
| R2_MAX_CLASS_B                           | 5000000                                                            |
| R2_PAUSED                                | no                                                                 |
| UPLOAD_SCAN_MODE                         | unscanned                                                          |
| SCHOOL_STORAGE_MB / STUDENT_STORAGE_MB   | 250 / 20                                                           |

Add Secret File `aiven-ca.pem` containing the downloaded Aiven CA certificate. No client private key is needed for this connection. Never set NODE_TLS_REJECT_UNAUTHORIZED=0. Leave SMTP fields absent until delivery is configured. Do not put BOOTSTRAP_PASSWORD, BACKUP_PASSPHRASE, restore credentials or migration credentials into the running service.

## Migration from your existing local installation

Use a separate protected terminal environment for cloud operations. Commands below run from apps/api, and load .env from that working directory. Do not overwrite your existing .env: use a separate checkout/environment or session variables that override it. Source and target credentials must never be mixed up. The application has no live cloud credentials yet; coordinate these steps before pressing Deploy.

1. Stop every local writer/API worker and preserve the local MySQL volume and apps/api/data/uploads. With **local source credentials** run the existing encrypted backup flow from the repository root: set a private BACKUP_PASSPHRASE and BACKUP_MAINTENANCE_CONFIRMED=yes, run `npm run backup:create`, then `npm run backup:verify -- <backup-file>`. The offline pilot backup is limited to 128 MB; if larger, stop and design a streaming migration rather than skipping verification.
2. With separate **Aiven migration credentials**, verified MYSQL_TLS=required and a local MYSQL_CA_FILE path, configure the empty target database in session variables. Set CLOUD_MIGRATION_CONFIRMED=yes and the backup passphrase only in that private terminal. Run `node src/cloud-import.js <absolute-backup-file>` from apps/api. It initializes schema, refuses existing target data, imports verified rows without deleting source records, revokes old sessions and creates the persistent R2 budget table. It does not seed demo accounts or create new passwords. Existing account/password hashes remain usable after logging in again.
3. Keep the source upload directory available under this checkout. Configure target R2 settings and FILE_STORAGE=r2, then run `node src/migrate-cloud-files.js`. It checks local file sizes, conditionally writes new objects and verifies downloaded SHA-256 hashes; reruns accept only identical existing objects. It never deletes source files. Failures stop migration; inspect target state before retrying. Failed/uncertain cloud writes consume reserved budget conservatively. Restore a missing source file from the verified backup before retrying.
4. Confirm the row/checksum counts and every upload identity. Create a separate runtime MySQL account, apply the project's generated runtime grants with FILE_STORAGE=r2 (includes SELECT/UPDATE only on sg_cloud_budget), then remove migration secrets from runtime. Aiven may restrict GRANT/create-user capabilities: verify in its console before treating deployment as accepted. Never run the app using unrestricted avnadmin as a workaround.
5. With only runtime environment, run `npm run deploy:check -- --database` after building. Set RENDER=true only in the separate operator validation environment to validate the intended hosted profile; Render sets it automatically at runtime. Verify both database schema and initialized budget table. Start Render only after the import/files checks pass.
6. Add the main custom domain, DNS and HTTPS as described in CLOUD-DEPLOYMENT.md. Test actual proxy behavior, login/logout, school isolation, reset, private file reads and print documents. Verify existing logo/gallery/resource files survived. Hosted pilot uploads now use the owner-authorized unscanned mode. Use disabled to pause uploads or required after installing and testing a real scanner.

## Implemented budget behavior

MySQL's dedicated sg_cloud_budget row serializes all reservations across workers, using a separate two-connection pool so reservations inside school transactions do not deadlock the main pool. Storage reserves the full bytes of each attempted PUT; A/B counters reserve one SDK operation before calling R2. SDK retries are disabled, timeouts bounded, keys are UUID-only and writes use If-None-Match:* to prevent replacing an existing object. Downloads are authenticated by existing app routes and bounded to 5 MB. No public bucket URLs or presigned bypass are exposed.

Counters are **cumulative, not monthly** in this first implementation. No automatic reset can accidentally grant a second allowance within a billing cycle. Deleted files and failed writes do not refund bytes: this deliberately overcounts and can eventually block uploads despite free space. Current caps are the project's strict maximums, not Cloudflare's billing limits; dashboard/manual uploads and other buckets bypass them. Do not share this bucket/token with other applications. No automatic owner usage-warning interface is included yet; review Cloudflare and database counters manually.

Inspect with a read-only operator query: `SELECT * FROM sg_cloud_budget WHERE id=1;`. Do not reset bytes to zero while existing objects remain. If a cap is reached, stop writes and reconcile with actual bucket usage and provider billing before an explicit operator adjustment. A/B counters can be reset only after checking a new provider billing period and other account usage; this is a maintenance operation, not a runtime-account permission or automatic button. Table/state loss is a fail-closed startup failure, not a fresh allowance. cloud-init.js inserts the initial row only if absent; never delete it to bypass limits.

## Pause and restart

- Set R2_PAUSED=yes and redeploy to stop all app cloud operations; no files are deleted. Set no and redeploy to resume. This does not remove existing storage charges or stop other clients using R2.
- UPLOAD_SCAN_MODE=disabled stops new uploads while preserving private reads. unscanned enables owner-authorized uploads without antivirus; required needs a real configured ClamAV scanner. unscanned-local remains forbidden in production.
- Render Suspend/Resume pauses the web service. Its disk is disposable; permanent files are in R2. Aiven power-off can lose data without provider backups: verify your own recoverable backups first, as documented in CLOUD-DEPLOYMENT.md.
- Legacy local backup commands are designed for local disk/table layout and must not be used as a complete cloud-backup claim. For the live cloud service use a verified full MySQL export including sg_cloud_budget plus an independently verified private R2 object backup; cloud encrypted backup/recovery automation is still a future extension. Preserve budget counters during restore to prevent granting excess allowances.

## Acceptance limits

Render's one-hop proxy profile assumes requests can only enter through Render's edge. Verify forwarded protocol/client-IP behavior on the real service and disable its default subdomain after custom-domain acceptance; Cloudflare adds another forwarding layer, so inspect actual client IP before relying on IP rate limits/allowlists. Do not use TRUST_PROXY=true. Global budgets limit storage operations even if IP attribution is imperfect.

Free plans do not guarantee uptime or no charges. Aiven's actual grants, TLS, Render egress/cold starts, R2 conditional writes and Cloudflare origin/bot settings still require real-provider checks. See CLOUD-DEPLOYMENT.md for deep-subdomain certificate restrictions and bot controls. Do not claim the site is live merely because the local tests pass.
