# v14 manual sync — acceptance review

Local test app: http://localhost:3014/v14 — version **14.0.62**.

## Ready for normal local testing

Add, Edit and Rate It now save to the isolated v14 Supabase library. They do not automatically update either Google Sheet. Use Sync → Sync Now to compare the new tracker, review proposed values, then Apply deliberately. Nightly remains off. The original v13 app and its Sheet remain separate. Avoid editing the same real item in both versions unless you intend to compare those separate records yourself.

Live Add/Edit/Rate It plus reload passed on one labelled book; it was recoverably archived afterward and never sent to Google. Full four-media sync/recovery regression passed in actual restored SQL with simulated Google; prior live Saros consolidation passed against the real new tracker. These are distinct evidence levels. The app currently has 2,337 active items and zero proposed differences. Full evidence is at the top of V14-SYNC-CHECKPOINT.md. No production deployment or nightly activation is implied.

Identity review: choose Same item (retain app record, consolidate the two tracker rows) or Separate edition (new concrete game platform, original edition retained), select App/Google Sheet for differing fields using bulk buttons or individual choices, then Apply Selected Changes once server readiness succeeds. One identity pair per run; unrelated differences must first converge. Separate supports game platform editions only. No agent-selected Saros decision has been applied. Fresh source changes invalidate a prepared selection; interrupted runs resume their sealed audited checkpoint. See V14-SYNC-CHECKPOINT.md for restored SQL/simulated-Google proof, installed022 and recovery backup. This does not claim live identity execution acceptance.

## Protected boundaries

- Original v13 app, original Google Sheet and production checkout are unchanged.
- Supabase is the v14 working library; only the new simplified tracker is a sync target.
- No nightly scheduler, production cutover, commit, push or deployment is enabled by this work.
- Notes and TV episode progress stay in the app. Unknown or ambiguous records never authorize a merge or deletion.
- Current local server uses explicitly authorized acceptance-writes mode: manual Add/Edit/Rate It and manual new-tracker sync are enabled; automatic metadata refresh is paused and nightly sync is off. Review-only mode remains available as a rollback.

## Review flow

1. Open Sync and refresh the preview. All comparisons use fresh source reads.
2. Review app-to-Sheet changes, Sheet-to-app changes and conflicts. A saved choice is not an applied change.
3. For an eligible new Sheet item, expand **Review all imported fields** before **Add to app**. Unset fields remain unset; Add-form defaults are not invented.
4. Check readiness and save the run checkpoint. Neither action changes media values.
5. Apply reviewed changes. Success is withheld until independent readback, audit checks and the complete baseline confirmation succeed.
6. If interrupted, check readiness and resume the SAME saved run. Do not create another run. Confirmed steps are skipped; uncertain Google writes are never blindly replayed.
7. Reopen the app. The library requests a fresh read after a confirmed sync and on reopening/focus.

## Evidence already collected

- Final 14.0.57 actual-browser no-change sync confirmed at **10/20/2026, 3:16:13 PM**: 2,337 matches, zero differences. Desktop/mobile screenshots `/tmp/cdl-14057-final-{desktop,mobile}.png`; mobile Home navigation present. Normal app POST still returns 403 during review-only acceptance.

- 390 automated tests, TypeScript, focused ESLint, production build and Rust checks pass. Migrations 020/021 are installed; zero scheduled targets. Fresh independent comparison confirms 2,337 matched records and zero differences.
- Larger-run recovery passed in a network-disabled real database restore: 100 exports across 2,406 test records using two checked package parts, and 20 interrupted/resumed imports with exactly one audit each. Altered parts were rejected before claim and confirmation. Google transport was simulated for this test; live bulk throughput is not claimed.

- Actual live app additions for all four media types, mixed updates in both directions, a rating conflict and a title correction; controlled restart at confirmed checkpoints; one import audit per item; private Notes preserved.
- Actual new Sheet-only game approved and imported through the browser in 14.0.56: status Completed, rating 8.5, date 2026-10-20 and 12 hours. Independent verification found one create audit/outbox/baseline and unchanged original records.
- All temporary Sheet rows removed and app test records recoverably archived. Original active library restored to 2,337 items, zero differences; final browser confirmation at 10/20/2026, 2:55:22 PM.
- Desktop/mobile Sync checks preserve the existing appearance and mobile Home navigation. Proofs and detailed hashes are in V14-SYNC-CHECKPOINT.md.

## Explicit limits — not automatic repair

- New Sheet-item import currently accepts one explicitly approved new item per run, with other source values already converged. Other new/ambiguous rows remain held.
- Invalid ratings/statuses/dates, reused IDs/ISBNs and unsupported nonempty metadata remain held rather than silently altered or discarded.
- Large runs are bounded by operations, verified package/journal sizes, Google request/body limits and tracker readback capacity. A status change can count as multiple field operations.
- Real Google throughput for hundreds of Sheet-to-app edits is not established by a simulated transport rehearsal. This is distinct from app-to-Sheet batches and from everyday app load speed.

## Final sign-off

The next user acceptance is the manual Sync experience and its stated limits. Nightly scheduling and any production cutover require separate explicit approval; they must not be inferred from acceptance of manual sync.
# Current UI acceptance — 14.0.63

Sync Now compares both sides; each item has Apply This Item and Skip, with Apply All Selected below. Genuine conflicts still require explicit source choices. Selected-only execution and baseline confirmation verified using restored SQL/simulated Google, including rejection of an extra unselected confirmation record. Live UI Skip/rendering checked on a labelled test movie; movie then archived, never sent to Google. Final fresh comparison: 2,338 checked, zero differences/review, nightly Off. 424 automated tests pass. This increment does not claim a new live Google Apply test. Full checkpoint: V14-SYNC-CHECKPOINT.md. Earlier acceptance notes below remain historical.

