# v14 backend migration — v13 parity contract and execution plan

Date: 2026-10-12
Status: Phase A authorized by the user on 2026-10-12. Begin read-only inventory; later acceptance gates remain in effect.

## 1. Outcome and non-negotiable scope

Deliver the existing v13 application, visually and functionally unchanged, with Supabase replacing Google Sheets as the application's primary read/write backend. The only planned new application area is Google Sheets synchronization. Existing authentication is an infrastructure prerequisite, not permission to introduce a new application shell or dashboard.

The v14 diagnostic cover grid is NOT the product design. Retain useful backend tests and import work, but remove that grid from the normal application entry when the parity implementation is ready. Do not replace it with another approximate recreation of v13.

Reuse the actual v13 rendering components, layout, CSS, fonts, assets, responsive rules, themes, controls, and interactions. No redesign, component-library migration, new pagination, reduced-feature browsing screen, incidental cleanup, or unrelated performance refactor. A discovered v13 bug is documented separately; repairing it is not automatically part of this migration.

Existing-screen changes are limited to invisible data-provider wiring. Any visible difference, including save-destination/status text, requires explicit approval. New Sync navigation placement and screen design require separate approval before implementation. Preserve truthful confirmation semantics without silently approving new wording.

## 2. Verified starting point and protections

- Production checkout: `/Users/metroclick/Projects/Claude/chris-delicious-library`.
- Reference: v13.1.32, commit `79524e8`, tag `pre-v14-13.1.32-2026-10-09`. Production `dev`/`main` are at that commit; checkout was verified clean during planning.
- Work only in `/Volumes/MAC Drive/Codex/worktrees/cdl-v14-foundation/chris-delicious-library`, branch `codex/v14-supabase`.
- Current isolated implementation is v14.0.3, uncommitted. It contains authentication, owner-scoped database functions, import tooling and a diagnostic UI. It is not a parity build.
- Test project is `xnitocbxdpikvfxssbvm`. Existing import verification recorded 2,337 items, 3,229 episodes and 1,829 explicit progress records. Recheck live state before future mutations; these are not immutable current counts.
- Original Sheet and production deployment remain untouched. Only the separately approved new tracker may ever be targeted by v14 sync.
- No commits, pushes, deployments, production environment changes, paid upgrades or scheduler activation without explicit authorization.
- Preserve all current work. Do not reset/reimport over the populated test database. Snapshot it before schema/data migrations and retain audit history.
- Code increments the patch version in all seven established locations; documentation alone does not bump it. The lead integrates version changes, not parallel workers.

## 3. Definition of parity

### Visual parity

At identical data, preferences, browser, operating system, viewport and selected state, v14 must match v13: typography/weight, colors, spacing, sizes, borders, icons, shadows, cover crops, 3D geometry/motion, highlights, sidebar visibility, overlays, menus and mobile navigation.

Compare Mac against Mac and Windows against Windows; do not mistake platform font rendering for a backend regression. Use deterministic data/time and stable assets for screenshot comparison. Mask only recorded dynamic timestamps/version text and separately approved backend-label differences. Do not mask layout or theme differences. Every meaningful image difference must be fixed or explicitly accepted; a passing build is insufficient.

### Functional parity matrix

Inventory actual routes, view states and controls before marking this list complete. Each row gets reference evidence, implementation owner, tests and pass/fail status.

| Surface | Behaviors that must remain |
| --- | --- |
| Home and four media dashboards | Existing rows, counts, cover selection, navigation and preferences |
| Library Cover/List/Shelf | Existing layouts, 3D toggle, sizing, sorting, search, filters, selection and drag behavior |
| Upcoming | Dates, countdowns, filtering and shelf placement |
| Now Playing / Play Next / Read Next | Membership, manual order and drag persistence |
| Movie / TV Watchlists | Grouping, Pending Return or Release, counts and episode progress |
| Completed Gallery | Selection, carousel, keys, spotlight, 3D/reflection, theme, ratings, notes and filters |
| Smart Lists / Discover | Rules, sidebar availability, recommendation actions and existing provider behavior |
| Full details / compact previews | All four media types; related items, artwork and existing notes placement |
| Add / manual entry / Edit / Rate It / delete | All fields, status choices, validation, identity handling, confirmations and cancellation |
| TV episodes | Single episode, season/show bulk operations, dates, unknown state and metadata refresh protection |
| Statistics / Year in Review / Activity | Same calculations, ratings, dates, filtering and historical activity |
| Themes / settings / artwork utilities | All existing theme modes, 3D preferences, custom covers, R2 and saved configuration |
| Mobile / tablet | Existing touch controls, menus, bottom bar, overlays and responsive transitions |

Authentication/sign-out must not leak another account's data through caches or retained component state. Native behavior is inventoried separately: preserve the existing native product; do not claim v14 native parity or cut over native until its queue/reopen behavior is actually implemented and tested.

## 4. Architecture: keep the interface; replace its data source

Introduce one typed data-provider boundary underneath the existing application. Do not intercept global fetch, impersonate Google endpoints, or scatter separate Supabase logic into every visual component.

The boundary covers library snapshots, settings/order, activity, item mutations, episode progress and refresh operations. Reuse current row-to-media parsers where practical, with a tested compatibility adapter supplying their expected field formats. Keep Supabase stable item IDs and revisions alongside legacy display fields; never identify writes solely by title, ISBN or array position. Platform editions remain independent.

Canonical database values must override imported legacy copies, including deliberate blanks, zero ratings, cleared notes and dates. Preserve book five-point ratings, TV status values including Pending Release, natural artwork aspect ratios, R2 artwork and manual ordering. Do not turn unknown watched state into an explicit unwatched value. Preserve imported provider corrections and approved duplicate decisions without repeating cleanup blindly.

No Google Sheet fetch or Apps Script write may occur during normal v14 browsing or editing. App saves commit to Supabase with authorization, revision checks, idempotency and an atomic audit/outbox record; readback verifies success. Sheet synchronization is a separate operation. Existing TMDB/IGDB/book metadata services and R2 remain available through appropriately isolated server routes; replacing Sheets must not silently disable them.

Reads must be current on load/refresh and after saves. Cross-device updates need revision reconciliation and reconnect/focus refresh; do not label a disconnected or unverified snapshot current. Any cache policy must respect the user's no-stale-data requirement, not serve an old snapshot as confirmed fresh. No offline success claim unless durable offline queue behavior exists and is clearly pending.

## 5. Sequenced work and acceptance gates

### Phase A — freeze and record the reference (read-only)

1. Preserve source, current test database and existing recovery assets.
2. Inventory every screen, action, data endpoint, stored preference and provider dependency.
3. Capture desktop/mobile screenshots and interaction baselines across light/dark/classic/shelf themes; include completed-gallery theme independence.
4. Create deterministic read-only fixtures so testing v13 does not edit its live Sheet.

Gate A: approved parity inventory and explicit allowed-difference list. No UI reconstruction begins.

### Phase B — data contracts and compatibility tests

1. Specify provider inputs/outputs and stable identity/revision propagation through the existing parsers.
2. Implement/test read projections for four media types, episodes, settings, artwork/order and activity.
3. Compare original fixture parsing with Supabase projection parsing, field by field. Separate deliberate approved data corrections from regressions.
4. Inventory browser-local-only preferences and isolate v14 storage from v13. Import desired preferences deliberately, never overwrite production storage.

Gate B: identical rendered inputs for equivalent data; no hidden fallback to production URLs; owner-isolation and unknown/blank/date/rating tests pass.

### Phase C — complete mutation coverage

Port and test all existing actions: add/manual entry; full edit and Rate It; delete; cover replacement/upload/sync; metadata refresh; recommendations; settings/themes; manual order and smart lists; episode/season/show progress. Keep metadata separate from user-owned values.

Each action requires: correct stable target, permission checks, atomic persistence/audit, retry safety, fresh readback and refresh/reopen confirmation. Exercise network loss, timeout after commit, double click, stale revision, duplicate title/provider ID and partial batch failure. Persist per-record outcomes for bulk operations. Do not show successful completion when any required record is unconfirmed.

Gate C: every inventory action works against test Supabase. Unsupported actions are not silently disabled or left as working-looking buttons. Original Sheet remains untouched.

### Phase D — integrate the actual v13 application

Mount/reuse the real app at the authenticated v14 entry. Replace only data-source plumbing; keep existing rendering markup/styles and navigation behavior. Remove the diagnostic grid from normal entry, preserving diagnostic tests separately. Do not expose this as a finished parity build while write paths or provider routes are missing.

Gate D: screen-by-screen comparison passes, including all themes, mobile menus, full details and Completed Gallery. User reviews representative comparisons before the app is called visually equivalent.

### Phase E — add the approved Sync area

Design a small screen using existing visual language and get approval for its navigation placement and render. It contains manual Sync, last confirmed sync, pending changes, nightly-sync configuration, per-item progress/errors, conflict review and retry controls.

Only the new simplified tracker is used. Preserve the user's selected columns: no TV episode progress and no Notes export. Keep those fields in Supabase; removing a column from the tracker must never clear the corresponding database field. Agree on a stable row identifier/mapping that tolerates row moves; do not silently add visible columns the user removed.

Use three-way comparison against each record's last confirmed sync baseline, not timestamp-only last-write-wins:

- Only Supabase changed: export mapped fields.
- Only Sheet changed: validate and import mapped fields.
- Both changed identically: mark reconciled.
- Both changed differently: hold the conflicting field for user choice, showing both values and the previous baseline.
- Missing rows/columns and suspected deletions: require explicit policy/review; never infer destructive deletion.

Process records with a resumable journal, stable IDs, revision checks and readback. Recheck edits made while sync runs before advancing the baseline. Conflicts remain unresolved for review; nightly runs never guess. Unaffected records can proceed, with partial completion clearly shown.

Nightly plus manual only, not after each app change. Verify a no-additional-cost scheduling option and choose time/timezone before activation. Backups are not a substitute for database recovery: test private export and restore separately. Original Sheet is permanently excluded from v14 write targets.

Gate E: dry-run diff, two-way nonconflicting updates, conflict choices, interruption/retry, omitted columns, duplicate rows and readback tests pass on the new tracker. Schedule remains off until explicitly approved.

### Phase F — acceptance, rollout and recovery

1. Run same-browser comparisons at desktop 1920×1080, 1440×900, 1280×800 and 1024×768; mobile 390×844 and narrow 375px. Test Chrome and Safari; verify Windows-specific typography on Windows when access permits. Unavailable environments remain explicitly unverified.
2. Validate the entire interaction matrix, TypeScript, relevant lint, production build, Rust check, and network destinations. Report existing lint issues separately from introduced ones.
3. Benchmark first usable library, navigation and save-confirmation latency under equivalent data/network/build conditions. Do not trade freshness or remove features for faster numbers.
4. Harden dependencies/auth before any hosted preview; verify free-tier/storage assumptions before enabling schedules or additional services.
5. Reconcile production edits made since the test import. Do not overwrite v14 test edits with a blind reimport; capture a final delta, review conflicts, and use a short agreed editing pause only for final reconciliation.
6. Obtain explicit acceptance and separate commit/deployment/cutover approval. Preserve the v13 link/build and original Sheet throughout side-by-side testing.
7. Rehearse rollback. A UI rollback does not move new v14 edits back into the old Sheet: preserve the v14 database/audit journal and reconcile post-cutover changes before anyone resumes using an older data source as current. No automatic writeback into the original Sheet.

Gate F: no unexplained visual differences, no missing actions, no unconfirmed data changes, documented recovery and explicit approval. No native parity claim without separate native tests.

## 6. Economical agent allocation

Model availability was checked in the current tool configuration. Proposed allocation, not agents already running:

| Work package | Proposed model | Scope and ownership |
| --- | --- | --- |
| Screen/action inventory and test checklist | GPT-6 Luna, low/medium | Read-only bounded files; report exact controls and gaps |
| Field projection and normalization tests | GPT-5.6 Sol, medium | Dedicated adapter/test files after lead approves contracts |
| Settings/order compatibility | GPT-5.6 Sol, medium | Separate adapter/tests; no visual components or database application |
| Regression fixtures and test expansion | GPT-6 Luna, medium | Synthetic fixtures/assertions for already specified cases |
| Backend integration, identity, auth, schema, episode safety and sync conflicts | Lead agent | High-risk design and implementation; review all delegated changes |
| Final visual/data acceptance | Lead plus user review | Evidence-based review, not the implementation agent's self-approval |

Use at most two useful independent workers concurrently. Workers get a short task packet, exact file ownership, approved contracts, required tests and forbidden actions—not the entire chat history. Only the lead edits `app/page.tsx`, migration application steps and version manifests. No overlapping write sets. Workers cannot commit/push/deploy, change production, apply remote migrations, copy credentials or expand visual scope.

Avoid duplicate repository scans and repeated broad reviews. Require concise outputs: changed files, tests, unresolved risks. Escalate after a repeated failed approach instead of letting a lighter agent loop. Reuse test results unless code/data changed. Older does not automatically mean fewer tokens; extra workers can increase total token usage. Choose lighter models for bounded work, and measure actual usage rather than promising a percentage reduction.

Every worker brief starts with: “Backend-only migration. Reuse v13 visual components unchanged. No CSS/markup/font/layout edits. If your task appears to require a visual change, report it instead of implementing it. Do not touch production, commit, push or deploy.”

## 7. Approval and next action

This document does not authorize execution. After user approval, start Phase A with one bounded lighter inventory agent while the lead defines the data boundary. Return the inventory and allowed-difference list before broader implementation. Do not restart the diagnostic-UI approach or present intermediate infrastructure as the completed migration.

Open decisions deferred to the relevant gate: Sync entry placement/render; nightly time/timezone and verified no-cost scheduler; tracker stable row-ID treatment; native v14 rollout; any unavoidable visible authentication/status differences. These do not authorize redesign of existing pages.
