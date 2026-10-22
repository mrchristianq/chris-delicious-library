# Step 2 — parity and performance acceptance

2026-10-19 · v14.0.37

**Step 2 COMPLETE — owner approved Gate D on 2026-10-19 at v14.0.37.** Explicit user sign-off: “yes, i sign off on step 2”. This accepts the bounded parity/performance package and its stated coverage limits, not deployment, Sync activation or native release.

## Results

| Requirement | Result |
| --- | --- |
| Actual v13 renderer, not a reconstructed UI | Reused existing Page/components. No design replacement. Supporting source comparison and paired renders recorded in V14-STEP-2-CHECKPOINT.md. |
| Desktop themes and representative screens | Four theme preview controls match measured geometry/font/colors; actual wood Library shelves, List, Gallery, Statistics and four-media full details compared. Approved data cleanup counts differ. |
| Mobile | Matching 390 × 844 full details for all four media; filter/menu controls match exact geometry/font/colors; matching Gallery cover/title/ratings/review/actions/carousel and top-of-page renders inspected. Statistics checked separately. |
| Warm-assets, fresh authoritative data | Four optimized authenticated loads: visible readiness approximately 2.2–2.8 seconds. No duplicate startup library API fetch observed. |
| Cold app assets | Three first visits to distinct fresh local origins; actual network requests for all 15 application assets in each sample, approximately 998 KB total asset response bodies per origin, no failed requests. Fresh library/settings visibly ready in approximately 2.4–3.1 seconds from page-request start. Details below. |
| Navigation | Library → Gallery 401 ms; Gallery → full details 393 ms; return 298 ms. Automation-inclusive single-sample observations, not paint metrics. |
| Confirmed live save | Normal UI changed Light → Dark, confirmed response plus independent SQL/audit verification, full reload retained Dark. Normal UI restored Light, confirmed response/audit, then exact original import provenance restored under revision/after-image guards. Both save timings recorded below. |
| Restoration/isolation | Full item, episode, episode-progress and other-setting fingerprints unchanged. Original theme JSON exactly restored. Zero enabled sync targets. Production checkout remains clean at 79524e8; neither Sheet accessed for writes. |
| Automated checks | 208 JavaScript tests, production build, explicit TypeScript, focused ESLint, Rust and whitespace checks pass at 14.0.37. No app-code changes during this acceptance continuation. |

## Cold application-asset measurements

A temporary loopback GET/HEAD-only proxy served the same optimized, read-only app at localhost ports 3016, 3017 and 3018. Browser caches are keyed by origin; all 15 static application requests were observed reaching the proxy at each fresh origin. Existing localhost authentication was used normally without reading/copying credentials. No shared browser cache was cleared and no browser settings changed.

| Origin port | First byte | Complete page stream | Visible fresh-data readiness, upper bound | Static requests / bytes | Failures |
| --- | --- | --- | --- | --- | --- |
| 3016 | 470 ms | 2,734 ms | 3,066 ms | 15 / 997,628 | 0 |
| 3017 | 175 ms | 2,175 ms | 2,535 ms | 15 / 997,628 | 0 |
| 3018 | 173 ms | 2,056 ms | 2,404 ms | 15 / 997,628 | 0 |

Page response approximately 2.25 MB. Readiness criterion is the rendered imported Smart List after a fresh full page navigation. Timing includes automation/proxy overhead. This establishes cold **application assets**, not a pristine OS/browser process, cold remote artwork/provider caches, throttled mobile networking or a production SLA. Frozen v13 uses local CSV fixtures, so a live-backend percentage comparison would be misleading. Logs `/tmp/cdl-step2-cold-assets.log`; harness `/tmp/cdl-step2-cold-assets.mjs`, stopped afterward.

## Confirmed save measurements and restoration

Temporary optimized local harness used existing allowlisted/pinned test configuration with automatic TV refresh paused. Its front door permitted only two setting commands: `shelfThemeMode`, exact test library, Light/Dark values and expected revisions 1/2. Every other mutation was rejected. Normal authentication, same-origin checks, database permissions, revision/idempotency checks and independent fresh readback remained active. This did not change the standard launcher or application code.

| UI action | Request ID | Confirmed response duration | Setting revision |
| --- | --- | --- | --- |
| Light → Dark | e6191f89-80e5-4838-9ce5-a05e5ceb5ca5 | 2,659 ms | 1 → 2 |
| Dark → Light | b828018b-eddd-40f0-b7d9-1fc0759cb031 | 5,050 ms | 2 → 3 |

These are complete API response timings including independent fresh full-library readback, not optimistic visual feedback. Both returned 200 and approximately 8.9 MB JSON. This is a measured local baseline with noticeable latency variation, not a claim all saves are fast or every write path was benchmarked. Existing media/episode mutation correctness evidence is in Step 1; it is not relabelled as new timing coverage here.

Independent SQL verified matching values, revisions and both audit entries. Full reload retained Dark after the first save. Light was restored through the app, then exact original `legacy_profiles`/`source_rows` JSON was restored from the first audit before-image at revision 4, with a separate `test_restore` audit event. Cleanup required the exact two request IDs, contiguous before/after images, original JSON and current revision/last after-image; any intervening change would refuse cleanup. No records/audit/R2 objects were deleted.

Private baseline `/tmp/cdl-step2-pre-save.private.json`; post-check `/tmp/cdl-step2-post-save.private.json`; guarded cleanup `/tmp/cdl-step2-theme-restore.sql`; timing log `/tmp/cdl-step2-save-timing.log`. Node assertions verified original theme JSON equality and unchanged complete item/episode/progress/other-setting fingerprints. Live write harness stopped; standard optimized read-only app restored on 3014. No listeners remain on 3015–3018.

## Representative owner review

### Mobile Gallery

Original v13:

![Original v13 mobile Gallery](/tmp/cdl-14037-reference-mobile-gallery-top.jpg)

V14:

![V14 mobile Gallery](/tmp/cdl-14037-current-mobile-gallery-top.jpg)

### Mobile filter menu

Original v13:

![Original v13 mobile filter](/tmp/cdl-14037-reference-mobile-filter.jpg)

V14:

![V14 mobile filter](/tmp/cdl-14037-current-mobile-filter.jpg)

The selected sort option differs between browser sessions; measured control geometry/styles/options match. Dataset cleanup/count differences and the separately authorized Gallery calendar-date correction are expected, not a redesign. The inherited offscreen carousel/top scrolling behavior is shared by both reference and current render; no unrelated redesign was applied.

## Final gate

No checklist items remain in this bounded Step 2 package. **Gate D approved by the owner on 2026-10-19.** Exhaustive every-provider/every-device certification, native release, Sheet Sync and deployment are not Step 2 completion claims. Sync UI placement/design and production cutover retain their separate approval gates. Next: agree on Sync entry placement/design before implementing the new area; start with a non-writing change preview against the new tracker only. Nightly sync remains disabled.
