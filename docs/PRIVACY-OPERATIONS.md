# Privacy, access and retention operations

## School notice

Principal/admin/director opens **Security → Publish school privacy notice**, supplies jurisdiction/contact/notice/retention and explicitly confirms school approval. Stale school-settings versions are rejected; appearance/logo settings are preserved. Policy publication is audited by version. Authenticated school roles see it. Provide school-specific pre-login notices through the school's existing onboarding channel, since the shared login has no school identity.

This publication tool does not collect pupil consent or certify legal compliance. School leadership must approve its actual jurisdiction's legal basis, guardian/age rules, mandatory vs optional data, recipients, retention, rights process and incident/complaint contact. An administrator's approval checkbox is not a child's/guardian's consent. Record applicable consent/withdrawal evidence in the reviewed school enrollment process.

Suggested notice topics: educational/administrative purposes; account/profile, attendance, results, homework and finance data; assigned staff/verified guardian access; support/audits; optional photographs/uploads; storage/backups/security; retention/legal holds; review/contact routes. These topics supply no universal lawful retention deadline.

## Export / reviewed disclosure

The self-export requires a normal session/current password and allows five attempts per fifteen minutes per account. It selects explicit fields for the current user/current school, excludes credentials, peer data, internal metadata and draft/reopened/old report versions. Payments/concessions are selected through own fee charges. No storage paths or file bytes are included. Successful exports are audited without logging their content.

This convenience download is not a complete legal access response. Attachments, shared conversations, guardian/child data and retained internal records need verified authority, redaction and review. A guardian requests reviewed child disclosure rather than receiving every linked child's record in this self-export. Verify field coverage, use authorized academic/fees exports as supplements, review third-party data and deliver privately. Keep downloads outside Git/public folders/test traces.

## Requests

Users request access, correction or deletion review in Security. Requests are school-scoped, retry-safe, limited to five active requests, and visible only to the requester/leadership. They are privacy-category Operations tickets; managers record status/reasons with existing history/notifications. Support sessions cannot export or submit/publish privacy actions.

Verify identity, authority, scope, applicable deadline and legal holds. Closing a ticket does not establish disclosure or erasure. Record actual actions, retained categories/reasons, reviewer and evidence without copying sensitive records into ticket reasons.

## Retention / deletion procedure

Leadership can view read-only school collection counts. No automatic deletion dates or jobs are derived from a published policy. Existing token/import-preview/staged-orphan cleanup remains separate; bound academic/financial/audit/history records are retained.

Before erasure:

1. Verify exact subject/school scope and authority. Inventory enrollment, fees, reports, staff, shared guardians/accounts, conversations, files, audits/snapshots, legacy records and backups; appoint a school approver and independent verifier.
2. Determine eligible deletion/anonymization under approved retention/legal holds. Cross-school/shared accounts require separate review. Use account suspension/session revocation or guardian-link removal if appropriate; suspension is not erasure.
3. Stop writers and verify an encrypted backup with approved retention/key custody. Rehearse an approved remediation on an isolated recovery copy; review exact IDs/dependencies, including JSON snapshots and legacy `records`. Do not issue broad SQL deletes or disable live foreign keys.
4. A qualified operator implements narrowly scoped, school-approved remediation with rollback. Financial/academic and append-only audit obligations may require retention/pseudonymization. This release intentionally has no one-click hard-delete command.
5. Independently verify before/after records, shared access, private downloads/files and approved historical treatment; record evidence without retaining erased content.
6. Apply approved backup expiry/legal holds. Backup copies may retain old data until authorized expiry; protect them and reapply the erasure/remediation ledger before restored data becomes accessible. Do not claim immediate backup erasure.
7. Privately communicate actual outcome, retained categories/reasons/contact, then close the ticket with evidence.

Until this actual-host/jurisdiction process is reviewed/exercised, use synthetic data. Regressions verify export/request isolation and that closing a deletion request leaves data intact; they do not certify statutory compliance or actual erasure.
