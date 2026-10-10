# Encrypted backup and recovery

This Phase 4 milestone adds offline, encrypted MySQL-and-upload backups and an isolated restore drill. It does not automatically replace a running database, publish recovered data, schedule backups, or delete old backups. The web preview continues running in demo mode.

## Contents and limits

The bundle contains all 57 current application tables, including legacy records, migration versions, account/class memberships, audit history, authentication-token records and every tracked upload. Files must exist, be regular files and match their recorded size. Missing files fail the backup rather than producing an apparently complete archive. Untracked orphan files, environment secrets, SMTP configuration, ClamAV definitions, server logs and MySQL system accounts/grants are excluded.

Format 1 uses gzip followed by AES-256-GCM authenticated encryption, a fresh 32-byte salt and 12-byte nonce per backup, and a 16-byte authentication tag. The passphrase derives a 32-byte key through scrypt (N=32768, r=8, p=1). The header is authenticated. These primitives use the built-in [Node crypto API](https://nodejs.org/download/release/v26.8.1/docs/api/crypto.html); no encryption package or paid storage is added.

This is an in-memory pilot tool with a 128 MB maximum uncompressed bundle and encrypted file size. Base64 upload encoding adds overhead. Capacity-test on the recovery host; large deployments need streaming or infrastructure-native backup tooling. Use the same application release and MySQL 8.4 schema for recovery. Unexpected application tables or non-InnoDB engines fail capture.

## Create an offline backup

1. Stop **all** API workers, uploads, scheduled cleanup, migrations and other database writers. The command requires an operator confirmation; it cannot detect every worker. A database snapshot alone cannot synchronize changing filesystem uploads. The tool uses a repeatable-read, read-only [consistent snapshot](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html?ff=nopfpls).
2. Use the configured MySQL database and an account permitted to read all application tables and their column metadata. Migration privileges are not needed for capture. Keep credentials in the local ignored environment or a secret manager.
3. Supply a long, randomly generated passphrase through the current shell environment. Keep a recoverable copy in a separate protected location; losing it prevents recovery. Do not place it in command arguments, source control or the backup directory.
4. Set `BACKUP_MAINTENANCE_CONFIRMED=yes`, then run `npm run backup:create`. The command creates a uniquely named `.sgbackup` file under ignored `apps/api/data/backups`, using exclusive creation. It prints the file path and counts, never pupil records or the passphrase.
5. Run `npm run backup:verify -- "<absolute .sgbackup path>"` using the same passphrase. Verification authenticates and decrypts in memory, validates the complete table set, row checksums, upload checksums and file manifest, without writing plaintext.
6. Clear `BACKUP_PASSPHRASE` and `BACKUP_MAINTENANCE_CONFIRMED` from the shell, then restart the API. Store an encrypted copy off the application disk in a school-controlled location, with access restricted to authorized recovery operators. Off-device media and available storage are school-provided; no paid service is assumed.

PowerShell can receive the passphrase without printing it:

```powershell
$backupSecret = Read-Host 'Backup passphrase' -AsSecureString
$env:BACKUP_PASSPHRASE = [System.Net.NetworkCredential]::new('', $backupSecret).Password
# Run the selected backup/verify/restore operation here.
Remove-Item Env:BACKUP_PASSPHRASE
$backupSecret.Dispose()
```

Use `try/finally` to clear the environment even when an operation fails. Environment variables and process memory remain accessible to sufficiently privileged local operators. Protect the operating system and recovery host accordingly.

## Restore into a new isolated target

1. Use a separate recovery host or private local test instance. Configure `RESTORE_MYSQL_HOST`/`RESTORE_MYSQL_PORT` if different from the source; otherwise the source host/port are used. Configure separate `RESTORE_MYSQL_USER` and `RESTORE_MYSQL_PASSWORD` with create-database and schema/data permissions. These credentials are not required by the running API. Never give the production service this recovery account.
2. Set the passphrase and run:

```powershell
npm run backup:restore -- "<absolute .sgbackup path>" sg_restore_drill_20261010
```

The target must start with `sg_restore_` and have an 8–40 character lowercase alphanumeric/underscore suffix. It must be new and different from `MYSQL_DATABASE`. `CREATE DATABASE` deliberately refuses existing targets. Uploads go to a newly created directory under `apps/api/data/restores/<target>`; existing directories are refused.

3. The tool creates schema from this release's migration code, checks migration versions and column layouts, restores parameterized rows, compares every table's checksum, verifies every foreign-key constraint and writes/checks every upload. Foreign-key checks are disabled only on this new target's insertion connection; they are restored before closing it. An explicit integrity scan is necessary because [re-enabling MySQL foreign-key checks does not validate existing rows](https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html).
4. All restored session and reset tokens are revoked. Users must sign in again and request new recovery links. Account password hashes and audit history are preserved.
5. A successful command prints counts and `isolated-restore-verified`. A failure may leave an incomplete **new** database/upload directory. Keep that target offline; investigate, then remove only the confirmed disposable target and retry with another new name. Existing source databases are never overwritten. The tool does not automatically purge these operator-created targets.
6. Before any manual cutover, use a separate checkout with the matching release, point it at the verified recovery database, and place the verified recovered files in that checkout's `apps/api/data/uploads`. Restrict directory permissions, configure secrets and scanners, and perform role/school isolation and document smoke tests. POSIX modes are requested by the tool; Windows operators must restrict NTFS ACLs because numeric POSIX modes do not establish Windows access controls. Serve the recovered instance only after acceptance. Keep the previous source isolated for investigation and rollback.

The restore directory contains plaintext school data. It is ignored by Git but requires the same access controls as live uploads. File and row integrity verification does not prove the source data was correct, malware-free or free from compromise.

## Synthetic drill and CI

`npm run db:recovery` requires recovery credentials. It creates randomly named, disposable source/target databases and a synthetic upload. It verifies encryption/decryption, 57 table checksums, 154 foreign-key constraints, upload bytes, school/class membership, cross-school file isolation, retained audit history, token revocation, refusal of an existing target and refusal of an internally inconsistent foreign key. Cleanup is limited to exact synthetic targets owned by that invocation. It does not back up or modify the working school database.

The MySQL CI job runs security, relational, operations and recovery checks using an ephemeral MySQL service and fixture-only credentials. These sample credentials are never production defaults. Local validation passes 50 API tests, the production web build and the synthetic MySQL restore drill. CI execution after pushing is a separate check; a local pass does not certify a remote run.

## Retention and remaining acceptance

Before real data, assign a recovery owner, choose and record backup frequency, recovery-point/recovery-time objectives, off-device storage, key custody, retention and legal-hold rules, and complete a drill on the actual deployment host. Keep a dated verification report and verify a copy after transferring it. Existing backups are never automatically removed by this feature. School-specific retention/privacy notices and a verified export/deletion process remain Phase 4 work; no arbitrary deletion deadline is imposed here.
