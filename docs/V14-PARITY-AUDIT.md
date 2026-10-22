# v14 parity audit — Phase A

## Step 2 technical acceptance — 2026-10-19

Bounded parity/performance checks completed at 14.0.37; owner explicitly approved Step 2/Gate D on 2026-10-19 (“yes, i sign off on step 2”). See V14-STEP-2-ACCEPTANCE.md for evidence and scope limits. Earlier performance/approval gaps below are historical. Sync/native/deployment remain separate gates, not additional Step 2 work.

## 14.0.37 backend-only continuation

Removed unused pre-write full-library reads for preferences and episode progress only. Existing writers still authenticate and independently confirm fresh persisted data. 208 tests and build/TypeScript/focused lint/Rust checks pass. No component styles, layout or rendering changed; prior paired visual evidence remains applicable, with no claim of a new exhaustive browser pass. Full details in V14-STEP-2-CHECKPOINT.md.

## Current acceptance summary — 2026-10-18, 14.0.33

Step 1 representative functionality acceptance is complete; current evidence is V14-STEP-1-ACCEPTANCE.md. Actual item/Smart List Delete, live partial-order failure/retry, future/undated episode exclusions, TMDB movie Add and uploaded-cover/failed-backdrop retry/reload/recovery are verified. 196 tests, focused lint, production build/TypeScript and Rust passed. This is not exhaustive provider/device/visual or release acceptance. Historical table rows below may describe earlier gaps; the Step 1 record supersedes their functional status. Step 2 is next.

Dependency-hardening checkpoint: 191 tests and clean production build/TypeScript passed; production dependency audit has zero known advisories, with five development-tool advisories remaining. Frozen v13 reference now refuses mismatched runtime versions; new paired comparisons require an isolated original-version runtime. This does not close outstanding visual or save-flow acceptance gates.

The sections below are the historical Phase A inventory, not a current implementation status. The actual v13 renderer is now mounted at /v14. See V14-INTEGRATION-CHECKPOINT.md for receipts, restore guards and individual test limitations.

| Surface | Evidence to date | Still required |
| --- | --- | --- |
| Library Cover | Matched desktop Oculus geometry at matching fresh cover preference | All theme/viewport combinations, List/Shelf and Windows/Safari |
| Movie Full Details | Paired 390×844 visual comparison of cover, text, controls, ratings and notes | Other media/theme combinations and matched provider recommendations |
| Completed Gallery | Paired desktop/mobile Oculus appearance; search/date filtering, Full Details, forward/reverse multi-item keyboard and Read More | Precise carousel centering, all themes/media and viewport matrix |
| Full Edit | Four-media review/status/rating/date save, clear, reload, restore; invalid/stale editor rejection | Remaining metadata fields and live selected-provider-save workflow |
| Add/archive | Live manual game and TMDB-selected movie Add/readback/reload, R2 artwork, actual Delete/archive/reload absence | Other provider-specific mappings not all live-tested; see current Step 1 record |
| Provider proposals | Movie/TV TMDB selection/cancellation; game IGDB selected rating; Audnexus title/ISBN edition and selected narrator; Hardcover title/ISBN edition and selected rating | Durable selected metadata readback and partial-artwork failure UI |
| Artwork | Live replacement/association/reopen/restore; live Full Edit rejected-cover retry after form reset and explicit-source recovery; deterministic double request, timeout-after-commit and confirmed-cover preservation | Live uploaded-cover/failing-backdrop case, restart recovery and live concurrency |
| TV episodes | Single toggle, season 3/24 rows, released 3 rows, stale UI; metadata refresh preserving progress; 1,000/1,001 synthetic limit/atomic failure | Additional future/special UI examples, native behavior |
| Smart lists | Live create/rename/delete/reload absence; exact original definition restoration; deterministic retry contract | Cross-device and visual variants belong to Step 2 |
| Statistics | Date Added fix; 1,305 fixture days preserved; 390×844 initial viewport matches; Games/2026 and annual-review core metrics compared; episode drill-down verified and two approved Doctor Who corrections explained | Desktop visual, full media/year/theme/scroll comparisons; totals differ by approved cleanup |
| Manual ordering | Live multi-view success plus actual second-write 503/error, retained-request retry, all-three confirmation/reload and exact restoration | Third-write failure deterministic-only; current custom list disables manual sort |
| Safety | Original checkout clean; isolated server read-only; 2,337 items/3,229 episodes, sync disabled; temporary QA writes restored with audit retained | Hosted security/free-tier check, production-delta reconciliation and separately approved rollout |

Authorized exception to strict visual parity: on 2026-10-17 the user requested fixing the inherited Gallery date shift. v14 long/compact labels and filter boundaries now keep date-only values on their calendar day. No UI style change. Other inherited issues are not automatically authorized fixes.

Current validation: 191 JavaScript tests and disposable SQL/concurrency suites freshly pass at 14.0.32; focused lint, production build/TypeScript and Rust passed in the preceding unchanged-code security checkpoint. Four-timezone date-adapter results remain historical. Full Page last compared at 14.0.28 had 312 lint errors in both v13 and v14, zero hook-order errors; full-file lint is not claimed clean. Read-only server; automatic metadata paused. This is not whole-app/native acceptance. No production cutover, sync scheduler, commit, push or deployment authorized by these results.

2026-10-12. Read-only source audit; not a visual or end-to-end acceptance report.

## Reference and constraints

Production checkout verified clean on dev at 79524e8 (v13.1.32). Existing v14 work remains isolated on codex/v14-supabase and is preserved. No application code, live records, environment configuration or deployments changed in this audit. No version bump for these documents.

Reuse the actual v13 presentation. No replacement grid, new pagination, CSS, typography, geometry, theme or interaction changes. Visible differences, including status wording, require approval. A lighter GPT-6 Luna agent is assigned the bounded screen/control inventory; lead owns data-path analysis.

## Backend boundary inventory

References below are to the production baseline app/page.tsx at 79524e8, not shifting worktree line numbers.

| Existing responsibility | Reference | Required backend replacement |
| --- | --- | --- |
| Four row parsers | 3873, 3952, 4035, 4096 | Compatible fields plus stable database identity/revision; preserve blank/zero/date semantics |
| Startup feed loading | 11099–11120 | Complete library, episodes and settings snapshot; no 60-item UI pagination |
| Delayed Sheet follow-up | 11328 | Supabase freshness/revision reconciliation, not a legacy Sheet request |
| Shared write helper | 7996 | Authenticated typed mutations; no production endpoint fallback |
| Save confirmation | 8661 | Fresh canonical readback of the exact stable record |
| Full edits | 8895, 9281, 9500, 9721 | Full editable fields for all four types, not only ratings |
| Rate It | 10375 | Existing modal and field semantics; atomic confirmed persistence |
| Add/manual entry | 10863, 10888, 10915, 10943 | Stable IDs, all fields and existing post-add behavior |
| Delete | 10062 | Owner-scoped deletion policy and confirmed removal |
| Episode mutations | 8170–8532 | Episode identity, metadata/progress separation, complete bulk readback |
| List edits | 17224 | Same list editing behavior, including multi-record outcomes |
| Artwork writes | 7476–7516, 7731 | Safe isolated R2/provider operations and confirmed item association |
| ChangeLog | 8113 | Atomic audit and compatible historical activity projection |
| Settings persistence | 11745, 11943 | Saved themes, order and configuration without legacy writes |
| Smart lists | 12362, 12460 | Preserve rules, identities and persistence |

## Important compatibility findings

- Settings are not uniformly last-write-wins: getSetting at 11562 uses the first matching Sheet row; artwork/popup settings at 6778 iterate rows. Projection tests must preserve effective values rather than blindly collapsing duplicates.
- Browser preferences include cdlSettingsCache, cdlTvEpisodeRows, cdlCoverOverrides, cdlPopupCoverModes, details mode/width, icons and mobile sizing. Preserve chosen settings while namespacing test storage by backend/account. LocalStorage IS origin-scoped, including port; cookies are not port-scoped. Same-origin /v14 paths share localStorage unless explicitly namespaced.
- The test save RPC currently accepts only status, personal rating, completion date, notes, tags, hours and year. Full edits/add/delete/episodes/settings remain separate migration work.
- Test proxy.ts blocks all legacy /api routes. Full details use /api/cover-proxy (BookDetailsPage:311, MovieDetailsPage:176, GameDetailsPage:212, TVDetailsPage:208). Mounting v13 unchanged without safe route work would break artwork behavior.
- Route inventory also includes media-search, recommendations, tv-episodes, upload-cover, sync-covers, ui-prefs, sidebar-icon and roadmap. Audit each dependency and side effect before allowing an isolated replacement. Never blanket-enable legacy APIs.
- Source skill status lists can lag the application. Preserve the current application's TV Pending Release option, not an older enumerated contract.
- v14 normal browsing/editing must not read or write Sheets. Sheets remains a separately approved tracker sync destination; database readback replaces Sheet readback for normal v14 saves.

## Proposed contract responsibilities (not implemented)

1. Read a complete owner-scoped snapshot with an explicit freshness/revision marker, compatible media rows, episodes/progress, settings and historical activity.
2. Carry database IDs and revisions through every parser and selection/edit flow without changing rendered fields.
3. Perform typed item/add/delete/progress/settings/order/artwork mutations using idempotency and revision checks; return durable outcomes and refreshed canonical data.
4. Handle reconnect/focus/cross-device reconciliation explicitly; never call a stale/disconnected snapshot confirmed-current.
5. Isolate external metadata/artwork routes from production credentials and user-owned data mutations.

## Gate A remaining evidence

- Review the screen/control inventory and map every action to an adapter operation.
- Capture reference screenshots and interactions with deterministic data/preferences across themes and target viewports. No screenshots were captured in this audit pass; visual parity is NOT verified.
- Build synthetic/approved read-only fixtures without editing the original Sheet or resetting the imported database.
- Preserve a current test database recovery snapshot before any later schema/data mutation. No database migration occurred in this pass.
- Allowed visual differences: none approved. Sync UI and unavoidable authentication/wording changes remain separate approval decisions.

Do not label the diagnostic test page a parity build. Gate A is still in progress.

## Reference harness and first visual evidence — 2026-10-12

Implemented scripts/v14/reference-server.mjs and its tests in the isolated worktree (14.0.4). It archives reference commit 79524e8 into a private temporary directory, excludes app/api and environment files, supplies a minimal child-process environment without service credentials, and serves the saved formatted Sheet snapshot through local CSV feeds. The reference app's page source is checked against the commit, allowing only CRLF/LF normalization. Existing application presentation code is not rewritten.

Run from the v14 worktree:

```sh
node scripts/v14/reference-server.mjs /Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-owner-evening-capture.private.json
```

Reference URL: http://localhost:3013 (loopback only). Renderer: 127.0.0.1:3012. Normal v14 test remains a separate app on 3014. The reference is for browsing/capture only, not saving. Its inherited v13 sync label refers to loading the frozen local feeds, NOT confirmation of current Google Sheet data.

Fixture SHA-256: 7d33974c990a6a7aa81fd5e599e095c431aa59585b56635d5eb565da98710747. Capture time: 2026-10-12T01:20:11.460Z. This is intentionally the unmodified v13 snapshot, not the cleaned Supabase import; differing counts must not be treated as a projection comparison until equivalent datasets are used.

Verified POST /api/sheets-write and GET /api/tv-episodes both return 403. CSV worker execution is allowed; service-worker script routes and legacy API execution are blocked. Read-only public artwork proxying is limited to observed R2 hosts plus TMDB/IGDB image hosts; redirects are rejected. No production environment or Sheet writes were used.

Initial screenshots (private local artifacts):

- /tmp/cdl-v13-baseline-20261012/home-desktop.png
- /tmp/cdl-v13-baseline-20261012/completed-desktop.png
- /tmp/cdl-v13-baseline-20261012/completed-mobile-390.png (requested viewport 390×844)

Browser inspection confirmed populated library rows, saved settings, Smart Lists, Completed spotlight/3D art, notes and mobile bottom navigation. This is a smoke baseline only. Remaining: full viewport/theme/action matrix, recorded effective device scale, fixed-clock comparisons, provider fixtures and actual v14-v13 comparisons. Provider search/recommendations and remote UI-prefs are not represented (ui-prefs fixture is empty); do not claim those surfaces are equivalent. Existing screenshot geometry/typography is evidence, not permission to redesign it.

Validation: 19 local Node tests passed; focused harness ESLint and TypeScript passed; production build completed with existing localStorage warnings. Rust check re-run after interruption passed (14.0.4, finished in 2.20s). No commit/push/deploy. Production checkout remains clean at 79524e8.

## Completed screen ownership inventory

The lighter agent returned a read-only inventory, reviewed against the baseline. All line references are in baseline app/page.tsx unless a component is named.

| Surface | Presentation to reuse | State/actions to compare |
| --- | --- | --- |
| Navigation | 4442, 6606, 26335, 27171 | Same destinations, selected states and back behavior |
| Header/sidebar/mobile | 19912, 22108, 22707, 23094, 30383 | Same controls, sidebar visibility and bottom navigation |
| Cover/List/Shelf | 22209, 28675; PhysicalCover.tsx | Same dimensions, 3D angle, hover, sizing and order |
| Completed Gallery | 27171; CompletedGallery.tsx | Independent theme, spotlight, carousel, search, filters and review |
| Full details | 27198; four *DetailsPage.tsx | Artwork, ratings, notes, related items and episode controls |
| Add/Edit/Rate | 30228; AddItemModal, *DetailsEditModal, RateItModal | Field lists/defaults, status options, validation and cancellation |
| Watchlists | 15502, 28675 | Grouping, shelf badges and progress |
| Statistics | 26335; StatisticsView.tsx | Same calculations, filters and Year in Review |
| Settings | 22707, 24668 | Same preferences, theme controls and windows |

Source inventory is complete at screen-family level; individual interaction coverage and screenshot capture remain pending. Smart Lists, Discover, artwork utilities and native workflows must remain explicit acceptance rows rather than be inferred from shared rendering.

Additional safety finding: merely opening a live v13 library can start daily episode refresh (app/page.tsx:13311 onward, calling refreshTvEpisodesForShow). Therefore a baseline browser must use an isolated fixture environment with writes blocked before navigation. Localhost settings-read-only alone does not protect every mutation path. The available browser tabs currently contain the v14 diagnostic page and the tracker, not a safe v13 reference instance.
# Current Step 2 checkpoint — 2026-10-19

14.0.36: see current V14-STEP-2-CHECKPOINT.md for exact theme control geometry/style matches, desktop and all-media mobile detail evidence, the found/fixed book calendar-day regression, same-request auth deduplication and the 2.2–2.8 second optimized warm-asset/fresh-data load baseline. 204 tests and build/TypeScript/lint/Rust checks pass. No full cold-browser/exhaustive-provider/save-timing or migration-completion claim; no writes/deployment/cutover.

See V14-STEP-2-CHECKPOINT.md for 14.0.34 source-order regression fix, guarded migration/backup evidence, paired visual checks, measured database-only timing and outstanding acceptance boundaries. Step 2 is in progress, not a completed performance or full-theme/device sign-off. Older entries below retain their historical context.

