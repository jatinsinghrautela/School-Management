# Runtime database permissions and security review

This milestone separates production API access from migration access, makes audit history append-only through the application store, and strengthens authorization checks during account administration. It is a targeted source review with regression tests, not a certification or an independent penetration test.

## Production migration separation

The API now checks that migration versions match this release (1 through 9) before using MySQL. In `NODE_ENV=production`, automatic schema creation/migrations are always disabled, even if `MYSQL_AUTO_MIGRATE=yes` was accidentally configured. In development, existing automatic migrations remain available unless `MYSQL_AUTO_MIGRATE=no`.

`npm run db:init` explicitly runs migrations and initial owner bootstrap. Run it as an operator using a separate migration account, with an encrypted verified backup before upgrades. Then start the API with the restricted runtime account. Do not put migration or recovery credentials in the production API environment. A version mismatch or missing migration table fails startup and closes the pool. Version checks do not establish that a database administrator has not altered the schema or data; deployment acceptance must verify the installation.

## Generate reviewable runtime grants

The generator prints SQL and does not connect to MySQL, create an account or apply permissions:

```powershell
npm run db:grants -- orbit_school schoolglass_runtime 127.0.0.1
```

Replace the database, account and exact source host with the installation's values. The account host is the address/hostname **MySQL sees for the API connection**, which may differ from `MYSQL_HOST` behind Docker/NAT. A database administrator can inspect `USER()` from the intended network path to determine it. Wildcard account hosts are not generated.

Use a newly provisioned account with a long random password and no existing grants/roles. The operator creates that account through a protected administration session, reviews the generated statements, applies them and inspects `SHOW GRANTS` for the exact account. Applying narrow grants to an existing broadly privileged account does not remove its old access. Account creation and changes to existing production privileges are deliberately not automated by this generator.

The 57 table-specific statements grant:

- Ordinary application tables and membership junctions: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- `sg_audit`: `SELECT`, `INSERT` only.
- `sg_migrations` and legacy `records`: `SELECT` only.

The runtime account receives no schema-wide/global grant, DDL, system-table access, account management or grant option. This uses MySQL's [table-level GRANT privileges](https://dev.mysql.com/doc/refman/8.4/en/grant.html). Migration, recovery and verified deletion/retention operations require separately controlled operator access. Keep MySQL on a private network and protect database transport and host permissions as part of deployment acceptance.

Configure the API's `MYSQL_USER`/`MYSQL_PASSWORD` with this runtime account, set `MYSQL_AUTO_MIGRATE=no`, and use `NODE_ENV=production` for production. `DATA_MODE=mysql` is required; demo mode continues to be rejected in production. The development Compose account remains unchanged; its broad migration access is a local development convenience, not a production configuration.

## Audit protection

Both direct and transactional store operations reject audit replacement or deletion. A caught rejected write does not get committed by the demo transaction adapter. MySQL writes reject an existing audit ID, and the restricted account cannot update/delete audit rows even through direct SQL. Existing audit rows survive normal runtime and encrypted recovery. No new schema migration is required.

These controls protect against accidental changes and SQL attempts under the runtime account. A database administrator, host compromise, recovery operator or incorrectly privileged runtime account can still alter history. External tamper-evident/immutable retention and administrative separation remain acceptance work. API exception logging no longer prints raw exception text, which could contain private SQL values; responses retain controlled business errors and generic server failures.

## Authorization fixes

Account status, profile, access and assisted recovery now re-read the target and acting administrator within the target's transaction, lock the acting account, and verify current activity, authentication version, role and all target school memberships before writing. Access changes validate proposed school assignments against this refreshed actor as well. A target moved to an inaccessible school while a request waits cannot be changed or receive a new recovery token from the former school administrator.

Recovery token creation and the recovery-issued audit event commit together. Inactive targets are refused; tokens remain bound to the target authentication version. Email delivery happens after commit, and delivery failures revoke the token through the existing flow. School principals/admins continue to manage their own teachers, students, staff and parents; the owner can manage school leadership. Owner/self recovery uses the normal password reset route rather than privileged account administration.

Support sessions additionally require their initiating account to remain an active platform owner, besides the existing parent-session expiry/version checks. Normal owner sessions retain the existing support reason, expiry, audit attribution and role gates.

## Review evidence

The regression suite now has 54 passing tests. New adversarial cases cover:

- Independent schools with null organization IDs require explicit membership; unrelated null-organization schools are denied.
- Guessing school-scoped workspace, family, fees, admissions, gallery, logo, notice and file paths returns denied/not-found responses. Supplying another school in a query/body does not change authorization scope.
- Cross-school class targets cannot publish notices or reveal another school's notice content.
- Moving a target across schools immediately before the account transaction blocks status, profile, access and recovery actions.
- Removing the initiating owner's role immediately ends an existing support session.
- Audit update/deletion, including caught transactional failures, is rejected.

`npm run db:permissions` uses recovery-administration credentials solely to create a random synthetic database/account. It derives the exact client host, applies the generated grants, starts a store with migration disabled and verifies normal reads/writes/transactions, append-only audit behavior, and SQL denial of DDL, audit mutations, legacy/migration writes and MySQL system-table reads. Cleanup is limited to the database and account created by that invocation. It never changes the real runtime account. The drill is also included in the ephemeral MySQL CI job.

Local validation: all 54 API tests, production web build, restricted-account MySQL drill and persistent MySQL authentication checks pass. Recovery compatibility is verified separately with the synthetic MySQL restore drill. Remote CI results are not inferred from local passes.

## Remaining release gates

An independent penetration review, production privilege application/verification, externally protected audit retention, jurisdiction-specific privacy/retention/export/deletion rules, actual-host recovery, keyboard/browser automation coverage, production HTTPS/secret isolation, monitoring alerts and a controlled pilot remain Phase 4 work. The new checks do not justify entering real student data before those gates are completed.
