# v14 production cutover — 2026-10-22

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

439 tests, production build, TypeScript, focused ESLint, Rust check and diff checks passed locally. These checks do not claim staged deployment, production promotion, production sign-in acceptance or final tracker convergence. Those are separate remaining release gates.
