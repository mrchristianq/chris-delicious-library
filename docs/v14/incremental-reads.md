# v14.0.97: verified device copies and incremental reads

The collection UI and Supabase source of truth stay unchanged. This release does not change Google Sheet sync, backups, restore, or save confirmation contracts.

## Read flow

1. The server authenticates the account and identifies its library, without streaming a complete collection into the page.
2. The browser reads an owner/library-scoped IndexedDB copy. Its schema, contents, inventory, and SHA-256 checksum are validated. This copy is not rendered as fresh yet.
3. An authenticated, uncached server request checks the current library revision. Unchanged libraries return a small confirmation with a fresh observation time.
4. Changed libraries get an authoritative record inventory. Only records with new fingerprints are fetched, in batches of 200 with concurrency limited to three. The inventory also removes deleted records and restores the original import ordering.
5. Database transaction and revision guards bracket all record reads. Concurrent writes cause a bounded retry; missing rows, authentication errors, or read failures never authorize stale/partial data.
Large library responses are streamed as JSON to avoid buffering a full collection into one serverless response. The client still validates the entire response before rendering. See [Vercel's guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).

6. After validating the merged collection, the browser renders it and stores the complete verified copy for the next opening.

Fingerprints include item metadata, episode metadata/progress, settings, and imported source positions, including maintenance edits without application revision increments. Full sync/backup functions retain their original tokens and projections. A targeted save does not advance the library revision; the next read still checks unrelated changes.

## Device storage

- Each browser/device needs one initial complete download. Clearing or evicting browser data repeats that download.
- Private browsing, quota errors, corrupt copies, and unavailable IndexedDB fall back to fresh server reads. Storage operations have bounded timeouts.
- There is no offline-success mode or TTL-based freshness claim. Existing focus, visibility, online, and manual-refresh checks remain.
- This is a local copy of signed-in collection data, not an additional historical backup or encrypted vault. Another account is never allowed to reuse it.

## Deployment and rollback

Prepared migration: `supabase/migrations/20261027003100_v14_incremental_reads.sql`.
It adds three read-only RPCs, restricted to authenticated owners. It does not create a change journal, modify collection records, expand anonymous access, or remove old APIs.

Apply the migration before deploying the application. A missing migration permits a full fresh read during rollout, sacrificing efficiency rather than correctness. Existing v14.0.96 remains compatible with the additive migration and can be redeployed without removing functions or restoring collection data.

No production database or deployment was changed while preparing this release.

## Validation

- `node --test scripts/v14/*.test.mjs`
- `node scripts/v14/test-bandwidth-database.mjs`: network-disabled disposable PostgreSQL; live writes: zero.
- `npm run build`, scoped ESLint, `cargo check`, and `git diff --check`.
- Local read-only browser check: complete collection loads, survives reload, and keeps current settings and appearance. Live Supabase does not yet have this migration, so this check exercises the full-read rollout fallback plus persisted-copy revalidation. Actual incremental SQL behavior is exercised in the disposable database.

A synthetic 2,349-item / 3,313-episode fixture measured 11,598,229 bytes for the complete snapshot and 432,470 bytes for a one-episode update (3.7%). This includes the record inventory and is not a live billing measurement. An unchanged reopen's confirmation fixture was under 350 bytes, excluding HTTP/authentication/page overhead.
