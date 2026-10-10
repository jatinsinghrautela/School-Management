# Set up the domain and production host later

No domain/server/subscription is needed for local development. Software here is free/open-source; hardware, connectivity, domain registration and external service allowances are separate and may cost money. No permanently free public Node/MySQL hosting is assumed.

## Host and hostname

1. Complete [Phase 4 acceptance](PHASE-4.md). Select a school-controlled machine with stable storage, supported Node LTS and MySQL 8.4, with an operator responsible for updates/recovery. Reused hardware can avoid new spending; verify internet/power availability and capacity.
2. Obtain control of a hostname/DNS and point it to the intended host only after firewall/proxy configuration. Verify the network permits inbound HTTPS. Until a suitable host/hostname exists, keep the demo on loopback.
3. Install Caddy as a same-host proxy under a restricted service account. [`deploy/Caddyfile.example`](../deploy/Caddyfile.example) requires replacement of its placeholder hostname. Caddy can obtain eligible hostname certificates and redirect HTTP to HTTPS; see its [official quick start](https://caddyserver.com/docs/quick-starts/reverse-proxy). Issuance requires public DNS/network reachability.
4. Expose proxy ports 80/443, keep Node 4000 and MySQL 3306 private, and protect uploads/backups/secrets using Windows NTFS ACLs or Unix permissions. Do not publish Docker MySQL on all interfaces or reuse development credentials.

## Install the accepted release

1. Use a separate deployment checkout of the accepted commit. Run `npm ci`, `npm run build` and synthetic verification. Preserve the previous build and verified backup for rollback.
2. Initialize the database using a separate migration account (`npm run db:init`). Bootstrap the owner with a unique temporary password, activate it privately and remove bootstrap credentials from runtime. Review [runtime grants](RUNTIME-SECURITY.md); runtime must have no DDL and only append-only audit writes.
3. Fill [`deploy/production.env.example`](../deploy/production.env.example) in a protected environment outside Git: exact HTTPS origin, dedicated runtime account/random password, `MYSQL_AUTO_MIGRATE=no`, `HOST=127.0.0.1`, `TRUST_PROXY=loopback`. Keep recovery/migration credentials and backup keys outside the API process. Leave SMTP/ClamAV blank until configured/tested.
4. Load the production environment and run `npm run deploy:check -- --database`. Require a pass before `npm start`. Use an OS supervisor for startup/restart and non-sensitive logs; test shutdown on the chosen OS.
5. Copy/modify the Caddy example into a protected real file; run `caddy validate --config <Caddyfile>` before starting its service. It overwrites forwarded protocol/host/client headers, allows 6 MB multipart overhead and proxies to loopback Node. API file limits still apply. See [Caddy header behavior](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) and [body limits](https://caddyserver.com/docs/caddyfile/directives/request_body). The example is not yet validated on an actual host.

## Live acceptance

- Verify HTTP redirects, trusted certificate and intended-host routing. From another machine confirm Node/MySQL ports are inaccessible and client-supplied forwarded headers cannot bypass HTTPS or authorization.
- Open every role through HTTPS; verify CSP, private files and printed report/receipt/certificate formatting, recovery links, school isolation and support return. Do not weaken CSP merely to hide a rendering failure. Record actual-host results separately from local tests.
- Run `npm run monitor:probe -- https://your-hostname --allow-remote` only against a host you operate. Schedule that fixed command with your existing supervisor/scheduler and route nonzero exits to an approved operator alert. The probe sends no messages itself. Verify deliberate dependency failure and recovery.
- Complete actual-host recovery, off-device encrypted storage/key custody, disk/quota monitoring and real MySQL capacity with synthetic records. Accept email/scanning before enabling those features.
- Complete [PILOT-ACCEPTANCE.md](PILOT-ACCEPTANCE.md), then approve a controlled school trial. Mobile follows web acceptance.

## Upgrade / rollback

Stop writers, verify a fresh encrypted backup, migrate with separate credentials, and start the accepted build under runtime permissions. On failure, isolate the instance and follow [BACKUP-RECOVERY.md](BACKUP-RECOVERY.md). Do not downgrade a migrated database in place or overwrite live data with an unverified restore; recover into a new private target and approve cutover.
