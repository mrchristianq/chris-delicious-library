# Library backups and nightly tracker sync — 14.0.78 (local, pending deployment)

## Approved policy

- One scheduled invocation daily at 09:00 UTC (5 AM Eastern during daylight time, 4 AM in winter; Hobby scheduling may run within the hour).
- A full logical library archive is created on the first successful run and every seven UTC calendar days thereafter. Missed/failed backups are retried on the next daily invocation, not silently counted as successful.
- Keep the ten most recent **verified scheduled full archives**. Only after a replacement has been uploaded, downloaded, checksummed and decoded may older scheduled archives rotate out.
- Original v13/migration backups and manually created recovery artifacts are outside that rotation. They remain unchanged.
- Google tracker comparison runs nightly. Only unambiguous unilateral changes and safely identified complete app additions may apply. Conflicting, invalid, unmatched Sheet additions, duplicate and uncertain identities remain for manual review. A conflict on any field holds the whole item.
- Before any nightly mutations, a recent full archive must be downloaded and verified and a small, fresh pre-write tracker safety archive must be confirmed. These small safety copies are not weekly full backups. No automatic deletion of historical manual or safety copies is authorized by full-backup retention.
- A 200 MB private recovery-bucket safety cap stops new uploads instead of silently filling storage or deleting unrelated files. No paid plan or infrastructure is required by this implementation; normal provider quotas still apply.

## What a full archive contains

All raw records scoped to this library: active **and archived** items, notes, ratings/statuses, metadata, identifiers, episodes, watched progress and revisions, settings, collections/order, asset references, import provenance, audit events, sync targets, baselines, outbox, conflicts and runs. The export is one consistent SQL data snapshot. Separate tracker safety archives preserve Sheet pre-write values; a library restore does not restore Sheet cells.

It does **not** contain account passwords, Auth sessions, provider credentials, Storage/R2 image bytes or the database engine. Cover URLs are preserved, but this is not an independent artwork-byte backup. Archive migration identifiers point to the matching schema in source control; private pre-install schema/data exports are retained separately.

## Download and recovery

1. Open **Discover → Sync → Backups & History → Restore a Backup**. Sign-in and library ownership are required; files are not public links.
2. Download a dated `.json.gz` archive. The server verifies the stored compressed checksum before returning the attachment. Keep downloaded copies private: they include personal notes.
3. Restore into a **separate disposable or staging database**, with the matching migration/schema version and the owner's identity. Never start by overwriting the live library.
4. Verify decompression, checksums, library identity, row counts, IDs, notes, episode watched flags/timestamps/revisions, collections and metadata. Restore raw tables in FK order using `jsonb_populate_recordset`; use the isolated restore rehearsal as the reference.
5. Compare the restored library with the live one and identify what would be replaced. Back up the current live state. Obtain explicit user approval before a live restoration.

### Guided restore (migration 28 and the 14.0.79 app)

**Back Up Now** uploads a full archive, downloads it, verifies both compressed and decoded hashes, and records the confirmed receipt. Manual and pre-restore safety backups are not automatically rotated.

**Preview Restore** displays item additions, updates and removals relative to the current library, plus settings/progress differences. Confirmation requires an explicit checkbox and **Restore This Version**. The server re-downloads the selected archive, creates and verifies a fresh safety backup, and performs one atomic owner-only SQL restore. If the library changed after preview, a sync is active, the preview expired, any row fails readback or the backup requires a newer schema, no restore is applied. Retry uses the same preview token and safety archive and cannot replay a completed restore.

Restoration preserves current audit/import/sync history rather than rewinding it. Items absent from the version are archived; stale revision counters are replaced with higher counters to reject old-tab saves. User settings, metadata, notes, collections and episode progress are restored. Saved tracker decisions are invalidated. Nightly sync is paused; **Google Sheets remains unchanged**. Review the next manual comparison before arranging to re-enable nightly sync. Recovery does not alter account permissions, credentials, or the original Sheet.

Migration 28 was installed on October 23, 2026 after fresh private schema/data exports and a fingerprint-guarded transaction confirmed all existing CDL data unchanged (2,349 active items; nightly worker remains enabled). The UI and route tests plus `node scripts/v14/rehearse-recovery.mjs` exercise synthetic records in a disposable network-disabled database; they do not authorize a live restore. The independent raw archive recovery procedure above remains available for disaster recovery.

**Review & Restore** first uses a read-only GET to verify the archive and compare it with a fresh owner snapshot. No restore token or record is created by this read, and it works in validation read-only mode. Continuing in write-enabled mode prepares a fresh confirmation; the user reviews it before the final restore. Read-only sessions cannot create backups or restore data.

## Security and operation

The scheduled worker is a separate ordinary Supabase Auth user with no library ownership and no direct CDL table grants. A checked RPC gateway permits only specific library-scoped existing CAS/audit operations and backup operations. Storage access is limited to reserved worker object prefixes; overwrite is denied. SQL permits deleting only scheduled full archives ranked older than the newest ten. The worker cannot manage accounts, read another library, refresh metadata or write notes/progress through the gateway. Only its password and the cron bearer secret are stored as Production-only server Secrets. No admin/service-role key is deployed.

`CDL_V14_NIGHTLY_ENABLED` and the worker's `enabled` binding must both be on. Disabling either is an immediate stop gate (an environment change requires redeployment). Removing the Vercel cron stops future invocations. A failure or unknown acknowledgement remains failed/review, never a success; existing sync journals provide manual recovery and prevent blind Google redispatch. A daily claim prevents overlapping duplicate invocations. Check the durable nightly status in Sync, not just HTTP 200 or a configured schedule.

## Validation

Production acceptance on October 23, 2026: 14.0.76 is live on the canonical app URL. The first hosted weekly archive was confirmed at 12:22 UTC, then independently downloaded and restored into a network-disabled disposable database. Every raw business table matched exactly (2,359 total item records including archived records; 3,313 episodes; 1,848 progress records). The archive was 10,413,569 bytes. The nightly comparison completed with zero applicable items and one item held for review; no conflict choice was inferred. The daily Vercel cron was independently read back on the 14.0.76 deployment. This was a manually triggered acceptance run, not evidence that tomorrow's scheduled invocation has executed.

The initial 14.0.75 acceptance attempt stopped before any upload reservation or sync dispatch. 14.0.76 added a function-scoped export timeout, removed unnecessary wide-row sorting, and an explicit operator-only retry restricted to an untouched failed job. Normal app/anonymous role timeouts remain unchanged. Runtime migration 27 and all security/restore tests passed before retrying.

- JS tests cover comparison policy, both sync directions, conflicts, invalid values, additions, archive round-trip and damaged storage.
- Isolated network-disabled PostgreSQL tests prove worker scoping, backup-before-write, immutable private storage, ten-newest retention and exact raw-table restore including notes and episode revisions.
- The guarded production DDL is rehearsed against private exports before installation, rejects replay and fingerprints every pre-existing library table to prove no data changes.
- Production activation still requires a READY tested deployment, registered cron definition, enabled worker, and an independently confirmed real run. A manual acceptance run is not proof that a later scheduled overnight invocation has happened.
