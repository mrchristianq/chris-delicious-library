# Step 2 parity/performance checkpoint — 14.0.37

## Final technical acceptance — 2026-10-19

See **V14-STEP-2-ACCEPTANCE.md** for the completed bounded engineering/testing package and representative owner-review images. Cold application assets now verified through three fresh local origins (15 network asset requests each, no failures; visible fresh data approximately 2.4–3.1 seconds). Confirmed live preference saves measured at 2.659/5.050 seconds with independent database/audit and reload evidence. Exact original preference representation restored; complete item/episode/progress/other-setting fingerprints unchanged. Temporary probes stopped; optimized read-only 3014 restored. No new code/version, commit, deployment or Sheet write.

**Step 2 complete: owner explicitly signed off on 2026-10-19 (“yes, i sign off on step 2”). Gate D approved at v14.0.37.** Earlier entries below that describe approval, cold-assets/save-timing work as outstanding are historical and superseded by V14-STEP-2-ACCEPTANCE.md. Sync design/activation and production cutover remain separate approvals.

## 14.0.37 continuation — 2026-10-19

### Additional mobile acceptance and navigation measurements

Actual frozen v13 production reference (3013) and optimized read-only v14 (3014) compared at independently measured CSS viewport 390 × 844. Mobile filter controls have identical rectangles, fonts, foreground colors and option text: close button, Cover/List, slider, both sort dropdowns and underlying mobile menu cards. Selected sort differs (Title vs Release Date) because test-session state differs, not a rendered control difference. Evidence `/tmp/cdl-14037-mobile-filter.json` and `/tmp/cdl-14037-{reference,current}-mobile-filter.jpg`.

Mobile Gallery selected the same Well of Ascention audiobook. Title, action buttons, edit-review button and carousel rectangle/typography match exactly. Paired top-of-page renders inspected: same cover/perspective/spotlight, ratings, title, review, mobile bar and spacing. Initial scroll-to-selection moved both versions to the same scrolled details position; those measurements are not top-of-page coordinates. Explicit normal upward scroll then captured the top view. Evidence `/tmp/cdl-14037-mobile-gallery.json`, `/tmp/cdl-14037-{reference,current}-mobile-gallery.jpg` and `*-mobile-gallery-top.jpg`. Different canonical dates on some other carousel records are not accepted as identical source values; this comparison uses the matching selected book and does not change unrelated data/date behavior.

Single-sample optimized v14 mobile navigation, measured around normal browser click plus visible destination wait: Library → Gallery 401 ms; Gallery → book full details 393 ms; full details → Gallery 298 ms. Destination accessibility state verified after each action. These are automation-inclusive upper-bound observations, not interaction-to-paint, image-decoding, statistical latency or a v13 percentage comparison. No persistence write performed.

Cold-browser limitation confirmed: browser capabilities expose visibility/viewport, not an isolated empty-cache profile. Do not clear the user's shared browser cache, copy authentication cookies or call a warm reload a cold first visit. A true cold-assets measurement remains unverified. Confirmed live-save timing also remains outstanding because current optimized validation deliberately blocks writes. No new code/version bump required for this acceptance-only continuation.

Found and removed an unused complete-library preflight from preference and episode-progress POST commands. Each existing writer still independently authenticates, invokes the owner-authorized transactional RPC, validates its revision/idempotent receipt and independently reads a fresh full snapshot before returning confirmed. The route retains same-origin, payload-size, strict-command and no-store guards. Item edits, creation, archival and episode metadata preflight behavior are unchanged. No UI, database, original Sheet or production change.

The setting route regression failed before the optimization. Route tests now assert that settings and episode progress dispatch their exact prepared request without the extra snapshot. Setting tests also assert denied authentication never writes, and a valid receipt cannot mask unavailable or wrong-owner readback; existing progress tests cover missing/changed/unavailable readback, partial receipts and authentication failure. This removes one bounded full read per affected command; no measured live-save latency improvement is claimed. Live browser saves remain blocked in the read-only local validation runtime.

Version bumped in all application/package/Tauri locations and private-test badge. The previous 14.0.36 visual and load evidence below remains historical, not a new 14.0.37 timing measurement. No commit, deployment, scheduler or sync activation.

Validation: 208 JavaScript tests passed; production build, explicit TypeScript, focused ESLint, Rust and whitespace checks passed. Logs `/tmp/cdl-14037-{tests,build,types,lint,cargo}.log`. Optimized read-only 3014 server restarted successfully on 14.0.37; authenticated browser reload shows imported Library/Smart List data. Production checkout remains clean at 79524e8. No live write was performed during this continuation.

## Current progress — 2026-10-19

Two additional, tested backend-boundary fixes are implemented. No redesign, production checkout change, database migration/data write, Sheet write, commit or deployment in this continuation.

### 14.0.35: avoid repeated initial authentication

The server Page already verifies its user before selecting a single library. The initial snapshot reader was creating another client and verifying the user again. Temporary read-only profiling observed authentication HTTP requests taking 45–149 ms in that session; this is not an overall loading-speed improvement percentage. The initial render now passes only its same-request verified client/owner to `readV14LibraryForVerifiedOwner`. Every snapshot is still fresh, RPC authorization and owner/library projection remain mandatory, and later API calls independently authenticate. Nothing is memoized globally or across requests/accounts. Malformed library IDs still fail before remote authentication.

Five new tests cover verified-request reuse without cached snapshots, independent API authentication, invalid identities, denied authentication, mismatched owners and no fallback on failed/incomplete data. Temporary detailed fetch profiling was removed; credentials, bodies and identifiers were never added to timing logs.

### 14.0.36: book completion calendar-day parity

The paired book full-details check found a real migration regression: the original displayed October 10, 2026, while the v14 projection displayed October 9. Canonical storage was correctly `2026-10-10`; the unchanged BookDetailsPage interprets that string as a UTC instant and formats it locally. The adapter now gives only book completion aliases the original Sheet-compatible `M/D/YYYY` calendar representation. Other media completion contracts, canonical ISO storage, saves and original components are unchanged. Clearing remains blank.

The new regression failed before the fix and passes across New York, Los Angeles, UTC and Auckland, including DST boundaries and leap day. Both live mobile versions now display October 10. The actual unchanged v13 parser parity fixture now uses the formatted Book Sheet completion cell, rather than assuming every media Sheet used ISO text.

### Stable optimized local test runtimes

The mutation-blocking v13 reference's development reload channel was blocked by its own safe proxy, causing reference reloads during checks. `reference-server.mjs --production` builds/serves the exact frozen v13 source and exact isolated runtime using webpack, without a development reload channel. Original source/lockfile remain unchanged. Same loopback/data/API/credential restrictions apply. The first Turbopack build attempt rejected the isolated node_modules symlink; the supported webpack build passed.

The v14 launcher also supports `--production`, strictly requiring `--read-only`, a completed isolated build, the existing pinned project/origin and allowlisted environment. Production-mode env files are checked too. This means optimized **local validation**, not a deployment or production cutover. Launcher/reference guard tests added.

### Expanded visual acceptance evidence

- All four desktop theme previews: button text, geometry, fonts, foreground/background/border colors match exactly at actual CSS viewport 1280 × 800. Source/sidebar counts differ because of approved cleanup. JSON: `/tmp/cdl-step2-theme-measurements.json`. Paired wood preview images were visually inspected.
- Actual wood Library shelves and desktop List: paired renders inspected; first rows, column labels, status labels and arrangement match. Dataset counts differ. The v14 read-only validation footer may report a rejected attempted preference save; no persistent theme changes were authorized/performed.
- Desktop movie (Oculus), game (Baldur's Gate III), TV (Tulsa King), and book full-details flows checked with matching records. Waited for actual headings instead of accepting lazy-import Loading frames. Provider recommendation content is not compared: it is blocked in the reference and live in v14.
- Matched mobile book: both 390 × 844, identical title rectangle x26/y341/w323/h69.359375, identical `850 34px / 34.68px Arial, Helvetica, sans-serif`; completion label October 10 in both. Evidence `/tmp/cdl-step2-prod-v{13,14}-mobile-book-matched.jpg`, `/tmp/cdl-step2-mobile-book-measurements.json`.
- Matched mobile movie/game/TV: all three have identical title geometry and typography in both versions at 390 × 844. Actual Search → quick details → Details flows used, not hidden state. Paired Tulsa King renders visually inspected, including 39 total/29 watched. Evidence `/tmp/cdl-step2-mobile-media-measurements.json`, `/tmp/cdl-step2-prod-{reference,current}-mobile-{movie,game,tv}-details.jpg`.
- Mobile Home/filter/Gallery/Statistics traversed and captures collected. Transition-only captures and captures whose effective viewport changed in the background are diagnostic, not pixel-perfect acceptance. The later `*-matched` captures supersede earlier unmatched book captures. Browser viewport AND effective CSS dimensions must be checked immediately before each capture; origin/tab zoom can otherwise differ.
- All temporary theme/search/filter changes were confined to isolated browser state and write-blocked test sessions. Original app/source/Sheet unchanged.

### Repeatable authenticated load baseline

An ephemeral loopback timing proxy on 3015 forwarded to the optimized, write-blocked 3014 app. It recorded only pathname category, status, start time, first-byte/response durations and byte count—not credentials, bodies, query strings or identifiers. Readiness was observed through the visible imported Smart List after a full fresh page load, in the same browser tool call as navigation. Static browser assets were warm; no cold-browser claim.

| Sample | First byte | Complete streamed response | Fresh library/settings visibly ready (upper-bound observation) |
| --- | --- | --- | --- |
| 1 | 265 ms | 2,498 ms | 2,841 ms |
| 2 | 210 ms | 2,110 ms | 2,406 ms |
| 3 | 150 ms | 1,982 ms | 2,223 ms |
| 4 | 150 ms | 1,977 ms | 2,204 ms |

Responses were approximately 2.25 MB, HTTP 200. No duplicate `/v14/api/library` startup read appeared in those four request traces: the original request's streamed snapshot was consumed. Logs `/tmp/cdl-step2-timing-proxy.log`, `/tmp/cdl-step2-observed-loads.json`. The tool-observed readiness includes automation overhead and does not mean every artwork image has decoded. Frozen v13's local fixture feed is still not a fair live-backend speed comparator; no percentage speedup or production SLA asserted.

### Current checks and remaining gate

204 JavaScript tests pass, production build/TypeScript, focused lint, Rust and whitespace checks pass. Logs `/tmp/cdl-14036-{tests,build,lint,cargo,types}.log`. Database code unchanged since the already-rehearsed/applied 015 SQL suite. Original Book/Movie/Game details components, Statistics and globals.css remain unchanged.

Files added/changed this continuation: `app/lib/v14/read-library-server.ts`, `app/v14/page.tsx`, `app/lib/v14/legacy-row.ts`, `scripts/v14/server-read-identity.test.mjs`, `scripts/v14/legacy-row.test.mjs`, `scripts/v14/parser-parity.test.mjs`, `scripts/v14/dev-server.mjs` and its test, `scripts/v14/reference-server.mjs` and its test; version/history in Page/package manifests/all Tauri version files; checkpoint/audit docs. No permanent timing proxy or fetch instrumentation added to the app.

The representative visual matrix is substantially expanded and the current optimized fresh-data baseline is recorded. Still not a full migration/cutover sign-off: true cold-browser assets, exhaustive provider-content/device combinations, and separately measured live save/navigation timings are not claimed. Sheet Sync remains the next feature group after the bounded parity/performance gate; it has not been activated.

Handoff: temporary 3015 timing process stopped and no listener remains. Standard 3014 optimized local build remains running read-only, automatic TV refresh paused. Final normal Library screen is loaded/Synced (`/tmp/cdl-step2-14036-final.jpg`); temporary viewport override reset. Production dev checkout remains clean at 79524e8.

## Earlier 14.0.34 checkpoint (historical)

2026-10-18. **In progress, not a completed visual/performance acceptance or cutover.**

## Confirmed regression fixed

Imported same-sort-value items lost their original Sheet row order because the bounded snapshot paginated by UUID. Games row 1301 (Clive Barker's Hellraiser: Revival) and row 1305 (Silver Pines), both released 2026-10-08, demonstrated the reversed ordering in the browser.

Migration 015 orders imported items by immutable import source row, UUID as deterministic tie-breaker, and app-created records afterward. Pagination and JSON aggregation use the same order. Internal source position/import ID are excluded from the response. UI comparators, styles, saved manual order and data records are unchanged. Reload now puts Hellraiser before Silver Pines, matching the frozen v13 reference.

The new SQL regression test failed before the fix and passed afterward, including one-item page boundaries, new-record fallback and provenance non-disclosure. All disposable SQL/concurrency suites passed after migration 015.

## Backup and guarded test-project application

- Private backup: `/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/pre-14034-SpzAgq` (mode 600 files).
- Schema SHA256: `dc8e615e4c1d6f7c4e6bcdc169556bce47f1a1a50fe9470467ed80af394bb03d`.
- Data SHA256: `7f7bfc0e58df627a41a3a80f926da8055d807ed4ea4a196780a57ef8b2240f06`.
- Restored the actual backup in a network-disabled disposable Postgres container, applied only 015, and verified every cdl table fingerprint unchanged. Removed only that disposable container.
- Applied only 015 to pinned test project `xnitocbxdpikvfxssbvm` with exact prior 14-migration history and rehearsed-backup hash guards. Application transaction verified every cdl table fingerprint unchanged before commit. History now contains 15 migrations.
- Physical rows at rehearsal: 2,340 items (including recoverable QA archives), 3,229 episodes, 664 settings, zero enabled sync targets.

## Paired browser evidence

Reference is actual archived v13 commit 79524e8 with its exact lockfile/runtime, isolated behind a mutation-blocking local fixture proxy on 3013. V14 remains read-only on 3014. Original production checkout and original Sheet were not used for writes.

| Surface | Evidence and boundaries |
| --- | --- |
| Desktop header | Library button exact shared x269/y6, 66.6875 × 26, Arial/Helvetica 12px/700 and active colors. |
| Desktop Completed | Both 1280 × 800 main rectangles x259/y0, 1020 × 800; paired images retain existing spotlight, cover, title, ratings, review and carousel structure. Both show the same pre-existing right-edge clipping in this browser capture; not fixed as an incidental redesign. |
| Desktop Statistics | Paired settled screenshots: same header, cards/chart layout/type/palette. Dataset counts differ because of approved cleanup. |
| Mobile Statistics | Independently verified 390 × 844 viewports, paired settled screenshots: same responsive header/filter/card geometry. |
| Mobile book full details | Same selected Well of Ascension audiobook; paired settled screenshots show matching cover, actions, title, facts, rating rings and visual treatment. |
| Mobile Library/Gallery | Navigation/DOM inspected and captures collected, but some captures contain transition/stale frames. Not accepted as a completed pixel comparison. |
| Remaining themes/list/media/details matrix | Not complete. Reference navigation repeatedly returned to Home around timed-out browser actions; do not count attempted theme selection as acceptance. |

Proofs are local `/tmp/cdl-step2-v{13,14}-{gallery,statistics,mobile-statistics,mobile-book-details}.jpg`. Other mobile captures are diagnostic only. Book/Movie/GameDetailsPage, StatisticsView and globals.css have no source changes relative to the v13 baseline. This is supporting evidence, not a substitute for the outstanding live matrix.

Browser viewport overrides target only the active/latest-created tab; matching dimensions were checked from each actual DOM rather than inferred from the global override. Restore temporary overrides before handing off.

## Performance evidence, not a speed claim

- Owner-authorized read-only EXPLAIN ANALYZE: one 200-item snapshot page executed in 58.284 ms inside Postgres.
- Read-only full page enumeration/serialization: 44 pages plus initial manifest executed in 811.114 ms inside Postgres. Plan: `/tmp/cdl-step2-database-plan.log`.
- These are individual database samples, not browser first-usable-load, network or save latency, and do not prove v14 is faster or slower than production v13.
- Frozen v13 reads local CSV fixtures; v14 reads live Supabase. Comparing their wall-clock loading times would be misleading.
- The browser's read-only evaluation scope does not expose `performance.getEntriesByType`; the attempted navigation/paint measurement was unavailable, not a failed application load.
- No speculative caching, concurrency or freshness change was made. Complete request/network/render measurements remain necessary before choosing another optimization. Duplicate request-local authentication is a candidate to measure, not a confirmed bottleneck.

## Validation and changed files in this pass

- 196/196 JavaScript tests; full disposable database/concurrency suite including new source-order regression.
- Production build including TypeScript, focused helper lint, cargo check and git diff --check pass.
- Logs: `/tmp/cdl-14034-{tests,build,lint,cargo}.log`, `/tmp/cdl-step2-order-{before,after}.log`.
- New migration/test: `supabase/migrations/20261018001500_v14_legacy_source_order.sql`, `supabase/tests/legacy-source-order.sql`.
- Safe tooling: `scripts/v14/rehearse-integration.mjs` source-order mode and new pinned `scripts/v14/apply-14034.mjs`.
- Version/history/private badge updated to 14.0.34 in Page, v14 entry, package manifests and all Tauri version locations.
- No commit, push, deployment, original Sheet change, tracker sync or native package release.

Next bounded gate: finish the unmatched visual surfaces and collect a fair authenticated end-to-end load/navigation baseline. Do not restart Step 1 or add new features. Sheet Sync and release/cutover remain later steps requiring their own acceptance.
