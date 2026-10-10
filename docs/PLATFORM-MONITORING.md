# Platform monitoring

The owner Overview now includes operational metrics. The authenticated `GET /api/platform/monitoring` endpoint returns the same snapshot; other roles and owner support sessions acting as those roles cannot access it.

## Reading the metrics

- Enabled accounts counts accounts whose access has not been disabled. This is not a count of currently signed-in users.
- Independent schools counts schools without an organization. Schools onboarded counts all stored schools; no operational activity is inferred from onboarding alone.
- Recorded actions counts every retained audit entry, rather than the twenty entries shown in recent activity.
- Actions and actors in 24 hours measure audited operations. They do not measure page views or prove all enabled accounts are active.
- Stored uploads sums tracked file sizes, including staged files, archived gallery images and document history. It is not a filesystem free-space measurement; orphan files require separate maintenance checks.
- Requests, client rejections (4xx), server failures (5xx), average and maximum response duration cover completed API responses in sixty minute buckets. Health probes are excluded. The current monitoring response is included only after it finishes.

## Performance and privacy

At most sixty minute buckets are retained in each API process. No request URLs, query strings, account identifiers, authorization headers or request bodies are stored in these counters. They reset when the process restarts and do not aggregate across multiple servers. Snapshot timestamps and uptime are available in the API response.

Database-derived totals use existing collections with no schema migration. This initial implementation reads full collections on owner dashboard load and is appropriate for the synthetic pilot; replace these reads with indexed aggregate queries and capacity-test before a large production deployment. The dashboard uses snapshots, without background polling. Reload it for an updated snapshot.

## Configuration and release acceptance

Email and scanner indicators report configuration only. A configured adapter still needs a real SMTP delivery or ClamAV acceptance check. Disabled states remain safe. Demo data is ephemeral; MySQL data is persistent. None of these indicators certifies production readiness.

External uptime probes, alert routing, multi-instance aggregation, encrypted backups/restore drills, retention and privacy decisions, production deployment and a controlled pilot remain Phase 4 release work. No paid monitoring service or third-party telemetry was introduced.

Phase 4 now includes `npm run monitor:probe` for bounded liveness/readiness checks (five-second request deadlines, no redirect following). It returns JSON and exits nonzero on unavailable services without logging response contents. Default target is loopback port 4000. A remote host requires an HTTPS origin and `--allow-remote`, and must be a host the operator controls. Schedule/capture this command through existing infrastructure; no external alert messages are sent by the tool. `test:capacity` supplies an isolated synthetic baseline, not real MySQL sizing. Actual-host alert acceptance and multi-instance aggregation remain deployment work; start with one process.

## Validation

48 API tests pass, including bucket expiry, failure/rejection separation, privacy-safe counters, full audit totals, upload totals, safe disabled states and authenticated owner-only access. Frontend production build passes. The local owner dashboard was visually reviewed with readable cards, spacing and the sign-out control visible.
