# v14 production cutover — 2026-10-22

## October23 release follow-up

Production was still72 after the interrupted deployment work. User requested the nightly-backup omission and continuing Sync misalignment be fixed. Promoted the already-tested production74 deployment `dpl_8hH59NCijz74qRW6H2p3ujNKk8ng` on October23. Canonical production sign-in page now renders14.0.74. Includes Sync icon-slot alignment and preservation of SeasonTitle/SeasonPosterURL.

Database migration025 was already installed with data-fingerprint equality; private schema/data backup was restored and installation rehearsed before live application. Phony's8 season-one episodes received the provider's season artwork via the normal owner-scoped CAS metadata RPC; private readback receipt confirms existing watched progress and unrelated data unchanged. Private evidence directory `season-artwork-14074-Vs6ken`.

Nightly remains unimplemented/off: no Vercel cron definitions or enabled sync targets. Clarification requested October23: Google Sheet sync, full recoverable library backups, or both (recommended). Do not conflate tracker sync, pre-sync recovery snapshots and full library backups; notes/episode progress are app-only. No nightly success can be claimed until an actual scheduled run has verified durable output. No new commits or remote branch updates in this follow-up.

User approved production provided v13 is backed up, then approved bringing newer v13 additions/progress across while retaining cleanup decisions.

## Preserved v13

- Commit `79524e83e2908cf60817cb9633a6d71a7a85e433`, version13.1.32, existing tag `pre-v14-13.1.32-2026-10-09`.
- Private recovery directory `v13-before-production-ccpoPX` under the owner's CDL-Recovery folder: complete Git bundle, source archive, private environment copy, and restoration instructions. Independent bare-clone restoration plus full Git fsck passed.
- Original workbook untouched. Native workbook backup `1EX7RRVGotTRhfcF5tDRAjYjXoJ2j2mCrFtHWhazg2EI` verified by metadata readback.
- Existing v13 production deployment retained: `dpl_ZQxfyJzA2VkFZQqkrzV8wdHvyi8F`. Do not delete. Rollback uses this immutable deployment, not a v13 rebuild with v14 environment variables.

## Catch-up

Private `v14-pre-cutover-catchup-WEpGMl` holds fresh schema/data dumps, reviewed source capture/plan, guarded transaction and rehearsal/readback receipts. Original published feeds fetched twice with equal captures; original workbook never receives writes.

Plan `787daaafabccecb2fa383cb4d08f6d48e70acc057d0bd386fa3c50ab5da4cbb3`, batch `4000ed7b-2837-4a00-9adc-a36e2fd64677` applied once after isolated network-disabled restoration/rehearsal:

- 9 new items; 5 status changes; 55 new episodes; 2 existing episode-progress changes.
- Active items2340 →2349. Existing unrelated items, metadata, episodes/progress, settings and tracker baselines transactionally compared/preserved.
- Normal owner-scoped CAS/audited edit and episode RPCs used. New imports preserve raw-row provenance, metadata, identity, change events and outbox entries.
- Replay refused; fresh owner snapshot independently verified all requested changes.
- Wreckfest/Fist of the North Star and modern-only Doctor Who cleanup retained. Game editions not globally deduplicated by provider ID.

## Release72 gates

Production requires exact existing Vercel project ID and canonical production domain, plus separate explicit production enable/origin approvals. Preview gates stay separate. Hosted Google credentials and durable private recovery backups follow the approved hosted gate; no local filesystem fallback in approved production.

No design/layout changes. Sign-in wording distinguishes production from isolated testing. Nightly remains off; original Sheet excluded from every v14 write target.

439 tests, production build, TypeScript, focused ESLint, Rust check and diff checks passed locally.

## Confirmed operational results

- Normal hosted Sync Now / Apply All Selected completed at2026-10-22 18:56:52UTC. UI confirms2349items, zero review/differences. Independent fresh Google/app comparison matches2349records; no active plan. Baselines2349. Notes/episode progress remain app-only.
- Post-catch-up data dump retained privately. Fresh tracker recovery snapshot SHA256 `a7ed2638ea3b99dc87cfb10510369d6b78c3351cb8ddb474afc2050a544dcc3b` with compressed/decompressed verification.
- Production configuration added only to the existing project; service-account credential remains a server Secret, no original-Sheet access.
- Local release commit `3344a84` staged through CLI with `--prod --skip-domain`: `dpl_2KhsgFhqBFAL1PFfELNXpNHAjxeQ`, immutable URL `https://chris-delicious-library-88mieoamt-chris-qs-projects-823e8c6f.vercel.app/v14`. Build READY; browser renders YOUR LIBRARY14.0.72/sign-in without runtime error. No password entered. Some child sign-in copy still says test library/account; main library styling untouched.
- Canonical `chris-delicious-library.vercel.app` independently verified still points to the retained v13 deployment. No promotion or remote branch update yet.
- User approved the exact production callback and Site URL. Saved and independently reloaded in Supabase: Site URL `https://chris-delicious-library.vercel.app/v14`, callbacks localhost3014 and exact canonical production only, no wildcards.
- User reconfirmed the existing v13 canonical URL must switch, then said proceed. Promoted the staged production deployment `dpl_2KhsgFhqBFAL1PFfELNXpNHAjxeQ` successfully. Browser navigation from canonical root redirects to `/v14`, rendering YOUR LIBRARY14.0.72 and sign-in without runtime error. v13 deployment retained.
- Signed-in production acceptance awaits the owner's app sign-in; no password or session was copied from preview. Do not claim this check from the anonymous landing page. Nightly remains off. No remote branch updates: main/dev still v13, local release commit3344a84 ahead of isolated v14 branch. Future Git production publication needs controlled reconciliation to avoid reverting production to old main code.
