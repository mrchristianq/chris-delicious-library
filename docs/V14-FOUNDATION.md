# v14 foundation — isolated, not an app cutover

Working version: 14.0.3. Production v13.1.32 is untouched. Earlier sections record the staged foundation work; current capabilities are described in the 14.0.3 section below.

## Owner import and limited library workspace (14.0.3)

The local `/v14` workspace now uses authenticated, owner-filtered browse/get/save RPCs. It lists 60 items per page, searches titles, filters media type, and reuses the existing Rate It modal for status/rating/date/notes editing. Saves update the item, increment its revision, and append audit/outbox records atomically. The server action independently reads back the result before showing confirmation. Duplicate request IDs are idempotent; mismatched revisions reject stale edits. Anonymous and cross-owner access are denied. Raw provenance is not returned to the browser.

Persistent import is separate from `prepareImport`, which remains rollback-only. `prepareCommittedImport` requires the exact project, explicit owner/snapshot confirmation, a capture less than 30 minutes old, an empty target, and a real confirmed/signed-in owner. `apply-owner-import.mjs` stages bounded chunks in a private non-API schema, verifies their SHA-256, then inserts and checks all fields inside one transaction. The rollback rehearsal must pass before commit. Existing libraries are never overwritten. Private snapshots and generated SQL stay outside Git. SQL dollar delimiters are preserved by callback replacement and covered by a regression test.

This is a migration test workspace, not a replacement design or a completed app port. Full navigation, full-detail editing, add/delete, episode editing, manual-order/settings adapters, native queues and Sheet synchronization remain pending. Rate It retains its existing limitations on clearing non-note fields; the API supports explicit clears. The new Sheet remains untouched and synchronization is disabled; outbox records are not evidence of a Sheet sync.

Validation: 16 Node tests; new v14 code focused ESLint (zero errors, one image warning); TypeScript/production build; cargo check; isolated SQL tests for ownership, revision conflicts, retries, rating scale, notes clearing, and atomic audit/outbox. The reused RateItModal has pre-existing lint errors (two prefer-const and one set-state-in-effect), unchanged by the optional destination-label prop. Production checkout remains clean. No commit, push or deployment is included.

Hosted test import verified on 2026-10-11: 2,337 items, 3,229 episodes, 1,829 explicit progress records, 8,808 raw source rows and 664 settings keys. Blank progress remains unknown. The fresh snapshot includes FantasticLand. All seven source tabs were rechecked unchanged before commit; full-field SQL readback passed in rollback rehearsal and persistent import. The real signed-in account sees the imported library after reload. A temporary FantasticLand note was saved through Rate It, independently read back, verified after browser reload, then cleared and verified again; its original Backlog status, unrated value and blank completion date were retained. Two audit events/outbox revisions remain as test history; zero synchronization targets are enabled. Desktop/mobile workspace and modal were inspected. The disposable local database was removed; recovery snapshots remain private outside the repository.

## Scope

The first migration defines 19 private cdl tables: library ownership, raw import batches/rows/issues, library items, metadata, provider identifiers, episodes/progress, settings/collections/order, artwork references, change events, sync targets/outbox/baselines/runs/conflicts.

No browser grants or RLS policies are installed: all client access is denied, all tables enable and force RLS, and the cdl schema is not added to the Data API. No service-role credentials are copied to the app. This intentionally blocks app use until an authenticated transactional API is implemented and tested.

Sync targets accept ONLY test Sheet 1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0 and enabled must remain false. There is no worker, schedule or Sheet-write integration. An item save/audit/outbox transaction and revision handling are still future work; tables alone do not implement those guarantees.

## Isolated deployment

The linked test project must be xnitocbxdpikvfxssbvm. Check supabase/.temp/project-ref before every remote command. Never link this checkout to another project. Project CLI state is gitignored. No production environment file should be copied here. The unchanged legacy frontend is NOT a safe hosted preview yet; it has not been connected to Supabase.

Run `supabase db push --linked --dry-run` and review the exact migration list before applying it. No destructive reset is part of this workflow.

## Import audit

`node scripts/v14/audit-import.mjs PRIVATE-snapshot.json NEW-private-report.json`

Input shape: sourceSheetId, capturedAt, and tabs containing name and values (row 1 headers, following arrays source cells). The tool reads local JSON only, has no network/database clients and writes reports exclusively (no overwrite) with mode 0600. It preserves input and detects structural issues; it does not import, discard or merge records. Live personal snapshots and reports remain outside the repository in the protected recovery package.

Formula-mode snapshots preserve raw formulas, not all evaluated values; a paired evaluated read and source-change check are required before canonical import. Duplicate/blank headers and unknown columns stay in raw arrays. Report candidate counts are titled rows, NOT proof of unique valid media records. Date/scale review counts are not corruption counts. No title/ISBN deduplication is automatic.

## Validation

- `node --test scripts/v14/audit-import.test.mjs`
- `supabase db query --linked --file supabase/tests/foundation.sql` (transactional fixture rollback)
- Build with no production environment: `env -i PATH="$PATH" HOME="$HOME" NEXT_TELEMETRY_DISABLED=1 npm run build`
- `git diff --check`

## Remaining before any app connection

### Rollback-only importer preparation (14.0.1)

`node scripts/v14/prepare-import.mjs PRIVATE-PACKET NEW-PRIVATE-SQL OWNER-UUID`

This validates the linked test project, snapshot hash/stability, media ratings and episode parents. It produces a private mode-0600 SQL file, exclusively (no overwrite). It never connects to a database. The generated transaction checks that the owner already exists and the target is empty, then inserts raw provenance, items, metadata, identifiers, episodes, explicit progress, settings profiles and mapping evidence. Full field readback checks run before an unconditional ROLLBACK. There is no commit option. Never edit away the rollback to simulate a supported live import.

Blank episode progress creates no progress row, preserving unknown state in episode provenance. Settings values include legacy profiles; the unchanged frontend cannot directly consume them yet. Books' original identifiers remain in metadata/provenance pending a full identifier adapter. Collection/manual-order settings are preserved but not projected into collection_items yet. Owner authentication, application adapters and a separately guarded persistent importer remain required.

Run `node --test scripts/v14/*.test.mjs`. Full-data SQL rehearsal may run in a disposable no-network PostgreSQL container using the exact foundation migration and a local-only owner fixture. That fixture must never be created as a permanent hosted login. A local rollback success is not proof of hosted authentication, app save/reopen, sync or migration completion. Keep personal SQL and reports outside Git.

Implement stable ID assignment/import mappings, complete normalization and issue decisions, evaluated-cell capture, test tracker binding, owner authentication, API authorization, atomic revision-checked saves and idempotency, metadata/user-field separation and episode-parent type enforcement. Then test actual save/reload and backups. Native queues and browser-local settings need a separate import plan. Supabase is not yet a replacement for any current read/write path.

The schema must not be treated as a finished synchronization system or proof of migration success. The original Google Sheet remains the production source until explicit cutover approval.

## Local sign-in gate (14.0.2)

`npx next dev --webpack -H localhost -p 3014` starts the private `/v14` gate.
The gitignored, mode-0600 `.env.local` in this worktree contains ONLY:

- CDL_V14_TEST=true
- CDL_V14_SUPABASE_URL=https://xnitocbxdpikvfxssbvm.supabase.co
- CDL_V14_SUPABASE_PUBLISHABLE_KEY (test project's public key, never service role)
- CDL_V14_ORIGIN=http://localhost:3014

The gate rejects other projects, private API keys, hosted Vercel and native mode. Proxy blocks ALL legacy API routes in test mode and redirects legacy pages before they mount. Root layout skips the legacy service-worker/cache cleanup. Without test mode `/v14` is unavailable. This is not permission to deploy the legacy root: production environment inheritance remains unsafe and must be removed before any preview.

Supabase SSR stores test sessions in an independently named HttpOnly SameSite=Lax cookie; authenticated pages revalidate the user with Auth and are not cached. HTTP cookies are local-only; hosted HTTPS support is intentionally not enabled. Sign-up and sign-in run through same-origin Server Actions. Email confirmation returns to the exact allowlisted local callback; no user-controlled redirect destinations are accepted. No password, access token or service-role secret belongs in Git or logs.

The second migration adds only `public.cdl_v14_my_libraries()`: a read-only, owner-filtered status/count RPC with a fixed empty search_path. Anonymous execution is revoked. It does not expose `cdl`, grant table access, import records, assign ownership or enable saves. Local SQL tests cover own-library status, cross-owner isolation and denied anonymous/schema access, rolling back synthetic fixtures. No fixture accounts may be created permanently on hosted Supabase.

The user must create/confirm their real test account before it can be assigned an imported library. Do not choose a random account or infer an owner just because only one exists. Browsing, editing, episode saves and Sync UI remain pending. A successful build or login-page render does not prove signup/email delivery/session refresh or library save/reopen; these need the user's real sign-in.

Validation: 12 Node tests, focused lint, TypeScript/production build, cargo check, local owner SQL test; HTTP checks for root redirect, login 200 and legacy API 403; desktop/mobile login inspection. npm audit reports existing dependency advisories (22, including critical Next.js and fast-xml-parser); dependency hardening is required before any hosted preview. No automatic audit-fix or broad dependency upgrade was applied.

Hosted application on 2026-10-11: migration dry-run listed only 20261011000200. Direct `db push` stalled before applying, and was stopped. The exact migration body plus its migration-history entry were then applied atomically through the linked Management API (`supabase db query --linked`), after checking the exact test project and that the RPC did not exist. Readback confirmed the RPC, one history record, no anonymous execute privilege, zero accounts and zero items. Test Auth Site URL is http://localhost:3014/v14 and the sole allowed callback is http://localhost:3014/v14/auth/callback. Original localhost:3000 is not the test destination. Disposable local DB fixtures were removed with the rehearsal container; source SQL tests remain available to recreate them.
