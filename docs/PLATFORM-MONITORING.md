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

## Validation

48 API tests pass, including bucket expiry, failure/rejection separation, privacy-safe counters, full audit totals, upload totals, safe disabled states and authenticated owner-only access. Frontend production build passes. The local owner dashboard was visually reviewed with readable cards, spacing and the sign-out control visible.
