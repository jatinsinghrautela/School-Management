# Phase 4: local release implementation and deployment acceptance

The local release implementation includes privacy workflows, reproducible browser/API verification, monitoring probes, synthetic capacity checks, encrypted recovery and deployment preflight. Real-data release still requires the external acceptance gates below. The user has no domain yet; deployment is deferred and no hosting account is created.

## Available tools

- Security → Privacy: school-approved notice/contact/retention publication, password-confirmed selected personal-record download and tracked access/correction/deletion requests. Leadership reviews requests in Operations with reasons/history. A read-only inventory reports collection counts.
- Chromium, Firefox and WebKit browser matrix, keyboard/dialog, reduced-motion, responsive and automated accessibility checks, using isolated synthetic demo data.
- `npm run monitor:probe`: bounded liveness/readiness probes with JSON output and nonzero exit on failure. No school records/credentials are logged or external messages sent. Capture failures through an operator-configured supervisor/scheduler.
- `npm run test:capacity`: 100 synthetic authenticated reads at concurrency 5, p50/p95/max and failure counts. Always starts an isolated in-memory service. Zero failures and p95 below two seconds is a local regression threshold, not a production/MySQL user-count promise.
- `npm run release:verify`: API tests, build plus three-engine browser suite, then capacity baseline. Writes ignored `apps/api/data/release/local-verification.json` with revision, time, outcomes and external gates. Stops after failure. Check the working tree too: HEAD may have uncommitted changes during development.
- Proxy/environment examples in `deploy/`, [later deployment setup](DEPLOY-LATER.md), [privacy operations](PRIVACY-OPERATIONS.md), and [pilot checklist](PILOT-ACCEPTANCE.md).

## Verify locally

```powershell
npm ci
npx playwright install chromium firefox webkit
npm run release:verify
```

Linux runners need `npx playwright install --with-deps chromium firefox webkit`. The [Playwright browser guide](https://playwright.dev/docs/browsers) explains the bundled engines. WebKit checks do not certify every Safari/iOS release. GitHub Actions runs the three-engine suite and capacity baseline; a local pass does not establish remote CI success.

Use `npm run test:e2e` for Chromium, or `npm run test:browsers -- --project=firefox` for one engine. Do not repoint tests/traces at a real school.

For this D: workspace, set `$env:PLAYWRIGHT_BROWSERS_PATH = 'D:/Personal Projects/School Management/apps/api/data/browsers'` before installing/running checks. C: ran out of space during the initial browser/container setup; the browser cache was moved to the ignored project data folder. The Docker fallback could not download its image and is not marked accepted. Free system-drive/Docker storage before trying that optional route again.

With an existing Linux Docker daemon, `npm run release:container` runs the same checks in the pinned official Playwright image. It stages only source/config/tests, excluding `.env`, uploads, databases, Git and existing dependencies. The container is removed on exit; evidence is copied to ignored `apps/api/data/release/linux-verification.json`. Source snapshots remain there for inspection. This offers a reproducible alternative when a native browser cannot launch; it does not require changing Windows security settings. The source snapshot has no Git repository, so record its originating revision/working-tree state alongside the report.

## Gates before real student data

| Gate                 | Required evidence / responsible operator                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| School privacy       | Actual jurisdiction, approved notice/legal basis, consent/guardian evidence where applicable, retention/legal holds; school privacy lead |
| Independent security | School/role isolation, recovery/support/account changes, uploads/documents independently assessed; named reviewer                        |
| Live deployment      | HTTPS, runtime grants, separate migration credentials, network/secret isolation, CSP/document acceptance; operator                       |
| Recovery             | Actual-host drill, recovery objectives, off-device encrypted copy, separate key custody and retention; recovery owner                    |
| Manual accessibility | Keyboard, zoom, screen-reader labels/errors/reading order and real mobile-device findings; reviewer                                      |
| Operations           | Supervisor/outage alerts, actual MySQL capacity, disk/quota monitoring and incident contacts; operator                                   |
| Pilot                | Synthetic walkthrough, then authorized limited school trial and rollback; school lead                                                    |

SMTP/scanner may remain disabled; real delivery/uploads cannot be promised until configured and accepted. Disabled scanning also disables logo/gallery uploads.

No automatic irreversible erasure, consent assertion or arbitrary statutory retention period is introduced. Closing a privacy ticket does not erase records. Backups/audits/history require a reviewed deletion procedure and independent verification. Use synthetic data until these decisions and checks exist.

The first supported deployment is one Node process with same-host proxy and MySQL. Counters are process-local, not multi-instance aggregates. More workers require additional aggregation and capacity/recovery acceptance.
