# Deployment preflight and readiness

This milestone adds fail-fast production configuration checks, separate liveness/readiness endpoints, HTTPS enforcement behind a local reverse proxy and bounded shutdown. It prepares deployment; it does not install a proxy, obtain certificates, expose the application or certify a real installation.

## Preflight commands

```powershell
npm run deploy:check
npm run deploy:check -- --database
npm run deploy:check -- --development
npm run deploy:check -- --development --database
```

The default target is production. The command prints configuration errors, optional-service warnings and whether a built web application exists. It never prints secret values. `--database` checks the existing release schema and database connectivity without performing migrations or seeding accounts; it runs only after configuration checks pass. An invalid check exits with code 1. A valid report means the inspected settings are acceptable, not that the host, privileges, TLS certificates or school policies have been independently verified.

The current local development configuration intentionally fails the production profile. The development/database profile passes, and the demo website remains available.

## Production process requirements

The supported deployment shape is a same-host HTTPS reverse proxy in front of the Node API, which also serves the built React app:

- `NODE_ENV=production`, `DATA_MODE=mysql`, and `MYSQL_AUTO_MIGRATE=no`.
- `HOST=127.0.0.1` (or another supported loopback name/address), a valid port and `TRUST_PROXY=loopback`.
- An HTTPS `PUBLIC_APP_URL` containing only the application origin. Credentials, paths, queries and fragments are rejected. Subpath hosting is not supported by this configuration.
- A dedicated restricted MySQL account, a non-default password of at least twenty characters, an initialized matching schema and the generated runtime permissions from RUNTIME-SECURITY.md.
- A completed `npm run build` before production startup.
- One-time bootstrap passwords, recovery-account credentials and backup passphrases removed from the API process environment.

Partial SMTP configuration is rejected instead of suggesting that delivery works. SMTP and ClamAV may remain entirely disabled, as previously requested; their real delivery/scan acceptance checks are separate. Public application URLs require HTTPS outside localhost/127.0.0.1 previews.

`npm run start` applies these checks before opening the store when `NODE_ENV=production`. Schema initialization remains an explicit migration operation. Run production without development watch tools.

## Reverse proxy contract

The proxy must accept only the intended hostname, terminate trusted HTTPS, redirect external HTTP at the edge, restrict backend access to the local host, and **overwrite** forwarded protocol/client headers rather than preserving client-supplied ones. Use the proxy's request-size and timeout controls consistently with the application's five-megabyte file limit. Only the local proxy belongs inside the backend trust boundary.

Express trusts only loopback proxy addresses in production, following its [proxy configuration model](https://expressjs.com/en/guide/behind-proxies/). Application traffic that is not identified as HTTPS is rejected before body parsing or authentication. A sufficiently privileged process on the same host can impersonate a loopback proxy; protecting the host and restricting backend reachability are required. This profile does not support a remote proxy, unrestricted bind address or a container proxy topology without additional reviewed configuration.

The existing Helmet CSP keeps scripts/assets on the application's own origin and blocks inline script attributes. HTTPS request upgrading remains enabled for production and is disabled in the local preview, matching [Helmet's localhost guidance](https://github.com/helmetjs/helmet). No broad script/style policy relaxation was added. Production browser and document acceptance checks still need to run against the actual HTTPS endpoint.

## Health endpoints

- `GET /api/health`: process liveness, preserving the existing `status: ok` and storage-mode response. It does not assert database connectivity.
- `GET /api/ready`: `200 {"status":"ready"}` when the dependency probe succeeds; `503 {"status":"unavailable"}` on failure, timeout or shutdown. It exposes no database names, credentials, exception details or school data.

In MySQL mode, readiness uses a real `SELECT 1`; schema versions are verified on store startup and during explicit preflight. Demo readiness checks only the in-memory service and is not evidence of database persistence. Both probes may be called locally over HTTP so the reverse proxy/service supervisor can inspect the backend. External application traffic still requires HTTPS in production.

Results are cached for five seconds. Concurrent callers share the in-flight check. A two-second deadline limits the readiness response; if the underlying operation remains stuck, subsequent calls do not create an unbounded pile of probes. The MySQL query has its own 1.5-second timeout, failed probe connections are discarded, new connections have a five-second connect timeout and the application pool queue is bounded. Readiness may legitimately report unavailable during database/pool congestion. It does not check filesystem free space, ClamAV freshness, email delivery, backup recency or all table contents.

API responses use `Cache-Control: private, no-store`. Health/readiness probes are excluded from dashboard request metrics. Use readiness for routing and liveness for process monitoring; restarting a healthy process repeatedly during a database outage will not repair the database.

## Shutdown and acceptance

SIGINT/SIGTERM mark readiness unavailable, stop scheduled maintenance, stop accepting new HTTP connections and close the store after requests drain. A ten-second deadline forcibly closes remaining connections and exits with failure if draining does not complete. Test the service manager's signal behavior on the actual operating system; Windows supervisors may terminate processes differently.

Local evidence: 58 API tests and the production web build pass. Tests cover invalid production settings without secret disclosure, shared/cached probes, failure recovery, stuck-dependency bounds, unavailable response privacy, HTTPS rejection/forwarding and production CSP headers. Read-only MySQL preflight and the running demo readiness endpoint pass. This evidence does not replace HTTPS browser, network isolation, privilege, scanner/SMTP, backup/restore, retention/privacy and pilot acceptance on the actual host.
