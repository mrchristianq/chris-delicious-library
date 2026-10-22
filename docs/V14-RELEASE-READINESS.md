# v14.0.65 — local release checks and rollback

Date: October 21, 2026. This is a local acceptance checkpoint, not a production deployment approval.

## Completed

- App-to-tracker: Christmas at the Kringles added and independently confirmed.
- Tracker-to-app: owner reported successful live test.
- Conflict: owner selected Sheet rating9.8 for The Blood of Dawnwalker; app revision3 and confirmed baseline independently read back. No unrelated item applied.
- Missing identity: owner approved Hunger Games app values; explicit identity approval completed, sync readback confirmed, fresh comparison2,340 records/no differences.
- Interrupted-run recovery: production planner/dispatcher plus real restored PostgreSQL, network disabled, simulated Google. Lost final acknowledgement followed by stored-package reload and repeated resume: one Google batch only. Lost creation acknowledgement followed by restart/resume: exactly one new item. Skipped baselines unchanged, extra unselected confirmation rejected, original restored-library tables unchanged. No live interruption or destructive test against real data.
- Apply explanation: explicit per-item prerequisite list, direct Confirm App Record Identity action. Review safety gates unchanged; no implicit identity approval.
- Automated checks: 428 tests; production build, explicit TypeScript and Rust check; focused ESLint zero errors/two existing image warnings; whitespace check. No native installer built.

Evidence: `/tmp/cdl-14065-{tests,build,types,lint,cargo,diff,recovery,backup-restore}.log`. Logs in `/tmp` are temporary; the private release bundle retains copies.

## Fresh recovery bundle

`/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-release-14065-qTbKTc`

Directory owner-only; files private. Includes:

- `schema.sql`: cdl/public schema and functions.
- `data.sql`: current CDL library, metadata, episodes, settings, journals, outbox and baselines.
- `tracker.json.gz`: NEW v14 tracker user-entered values/formulas, formatting and validations, read-only capture. Original Sheet not written or replaced.
- `verification.json`: capture time, target identities, SHA256 checksums and successful isolated restore counts.
- `source.tar.gz`: uncommitted source checkpoint, excluding environment files/credentials, dependencies, generated build and native targets.
- validation logs and this checklist.

The database backup was restored successfully into a disposable network-disabled PostgreSQL instance:2,340 active items,2,340 baselines,zero running runs,zero nightly targets. Only that disposable container was removed; backups retained.

Scope limitation: this is an application-data recovery bundle, NOT a full Supabase-project export. Auth identities/credentials, provider secrets and R2 asset bytes are not included. Existing auth/project/R2 services must remain intact; do not delete the Supabase project or R2 bucket on the assumption this bundle replaces them. Private provider/config credentials remain in their current private locations and are intentionally absent from source archives.

## Exact safe rollback — local app

1. Stop using the v14 app. If a sync is running, wait for or resume its same saved run; do not start a different run or replay an old completed plan.
2. Identify the running v14 launcher by its full command and port3014. Stop only that verified process; never use stale process IDs or kill every Node process.
3. To retain read/review access while blocking ordinary app writes, restart from the migration worktree with:

```sh
node scripts/v14/dev-server.mjs \
  --provider-env /Users/metroclick/Projects/Claude/chris-delicious-library/.env.local \
  --tracker-config /Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/tracker-credentials.ljJkxV/connection.json \
  --review-only --production
```

Do NOT add `--tracker-manual-sync` in rollback mode. Ordinary CRUD and manual Apply are blocked. Confirm read-only mode from launcher output. Sign-in/read access remains.

4. Return to the existing v13 app/production deployment. Untouched checkout: `/Users/metroclick/Projects/Claude/chris-delicious-library`, clean `dev` at79524e8 (13.1.32). The original Sheet is still the v13 source. Do not merge this migration into that checkout as part of rollback.
5. Retain the v14 project, tracker and private bundle. v14-only changes after the original migration will NOT automatically appear in v13; reconcile/export these deliberately before abandoning v14. Returning to v13 is an application fallback, not data convergence.

## Data recovery — exceptional, separate approval

Do not run the SQL dump against the live project or overwrite the entire tracker automatically. First restore into a separate isolated database, compare changes since capture, and prepare narrowly scoped recovery. Newer app edits, River, Saros consolidation, Kringles and approved ratings must not be replaced by older snapshots. A full restore is a destructive operation requiring explicit approval, and owner auth must be mapped appropriately. Never restore the new tracker over the original Sheet.

Source rollback: extract `source.tar.gz` into a NEW directory, verify the manifest, install from the lockfile and build there. Do not extract over either dirty worktree. Reattach existing private credentials separately. No secret should be committed.

## Deployment audit — NOT ready to promote unchanged

One remaining production-enablement work package is required before Vercel launch:

- `app/lib/v14/config.ts` intentionally restricts origin to localhost3014 and rejects VERCEL/native.
- `tracker-manual-contract.ts` likewise blocks hosted manual sync.
- `tracker-read-server.ts` requires a private local manifest/key file.
- `tracker-recovery-server.ts` requires a Mac-local durable backup directory and rejects VERCEL. A hosted filesystem is not a durable backup substitute.

These are deliberate safety boundaries, not a reason to delete guards or merely flip an environment variable. Before deployment: implement approved hosted secret loading, exact permitted origin/auth redirects and durable private recovery-artifact storage; verify those in an isolated preview. Keep original Sheet denylist, exact new-tracker allowlist, owner authorization, baseline guards, readback and nightly Off. Production environment/link state has NOT been verified or changed in this pass. No free-tier or hosted performance claim is made.

Thus steps1–2 (local reliability/checks, fresh restore-tested backup and rollback preparation) are complete. Production activation is held by the concrete hosted-enablement requirements above, not just a final approval click. No commit, push, deploy, production switch, permission expansion or nightly activation occurred.
