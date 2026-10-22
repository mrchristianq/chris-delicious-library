# Tracker mapping ledger — 2026-10-19 / 14.0.44

## Initial reconciliation decisions saved

Owner confirmed current app values. All 174 field choices, 15 existing plans and the one valid app-value formula repair are saved in the audited initial-review preference. Fresh preview and full reload show zero outstanding review entries. This approves a reconciliation plan only: no rows have been consolidated/added, no provider or formula cells updated, and no sync baselines advanced. Current execution work starts from these saved, fingerprint-bound decisions; changed values must reopen review. See V14-SYNC-CHECKPOINT.md.

## Provenance mapping implemented

14.0.43 reads identity-only import provenance from the authenticated, owner-scoped `cdl_v14_tracker_provenance` RPC. It joins stable app UUIDs to imported source IDs and returns only original title/edition/provider identity, never historical status/rating/Notes/episode values. Fresh new-tracker rows are matched by exact normalized historical identity, not source row number. More rows than approved source multiplicity, shared identity ownership or stale library membership fail closed.

Live result: **2,336 mapped records, zero unresolved identity/column issues, 15 planned actions**. The remaining active app item is FantasticLand, explicitly shown as an app-only tracker-addition candidate. Plans are seven approved consolidations (including Fable and SEGA), seven imported provider corrections and one candidate addition. Plans are not executed, not baselines and not ordinary field-winner choices. Duplicate tracker values are not imported; canonical app values remain intact.

There are 190 total preview entries because resolving identity now exposes field differences previously held behind those flags. One is an invalid `#REF!` Released cell for Evil Dead Burn, blocked from field selection/import until repaired. This is a data-quality hold, not an unresolved record identity. 174 ordinary field comparisons remain selectable; 15 plans and the one invalid cell do not have winner buttons. No Sheet cells or app library/episode records changed.

Migration 016 was rehearsed against a fresh private schema/data restore, with all `cdl` table fingerprints unchanged and owner/foreign/anonymous authorization tested. Applied to isolated test project only, with backup/migration SHA checks, exact migration history and transaction-level all-table data preservation assertion. The protected endpoint is read-only; no new baseline/target/executor enabled. Earlier table below is historical context; its mapping actions are now represented by the plans above, not outstanding identity questions.

## Historical pre-provenance inspection — 14.0.42

## Verified current state

Fresh live preview: **2,323 uniquely matched app records; 171 review entries including 16 identity/column flags**. No Sheet values changed. No baseline established. These flags are not sixteen unanswered user questions.

Six same-title movie groups are now correctly separated by TMDB ID: Cheaper by the Dozen, Deep Water, The Lion King, Father of the Bride, Dial M for Murder and Mean Girls. Each release retains its own app UUID and provider identity. No row-position pairing. Duplicate, missing or conflicting provider IDs remain blocked. The Shows title `12 12 12` is read from its actual formatted label instead of the underlying date serial `41255`; that removes two false missing-record flags.

## Existing decisions to carry forward, not ask again

| Remaining flags | Existing canonical decision / evidence | Next mapping action, not yet executed |
| --- | --- | --- |
| Life is Strange; Dead Rising; Dear Esther; Among Us; The Wolf Among Us; Call of Duty: Modern Warfare II; Saints Row (7) | Imported provider corrections are already in the app: IGDB 7599, 4797, 3082, 111469, 2993, 200165 and 165346 respectively. Saints Row Steam is the 2022 reboot, explicitly confirmed by owner. | Link original tracker identity to the approved app UUID using import provenance; do not reverse corrected providers or match an unrelated edition by the erroneous ID. Provider updates still require an explicit reviewed write. |
| Wreckfest; Fist of the North Star: Lost Paradise; The Last Guardian; Samson; Survive the Night (5) | Owner approved one canonical record for each duplicate group. Wreckfest Abandoned; Fist Collection; Last Guardian Abandoned. Survive the Night: retain one audiobook. Existing canonical statuses/rating/notes remain untouched. | Carry approved many-to-one import provenance into mapping and plan duplicate cleanup on the NEW tracker only. Do not silently choose a duplicate's conflicting values or delete rows now. |
| Fable, app-only plus tracker-only groups (2) | Owner explicitly confirmed future Steam Fable; imported canonical IGDB 92550, Steam, Wishlist. Original rows 1247/1222 were consolidated during approved import. | Resolve these as the one already-approved corrected edition, preserving other genuinely distinct Fable records. No platform inference from title alone. |
| SEGA Mega Drive and Genesis Classics (1) | Owner approved one record. Imported canonical `SEGA Mega Drive & Genesis Classics` (IGDB 191344, Steam) already has a tracker match; alias row remains separately flagged. | Plan removal/retirement of approved redundant alias, not a second app import. No broad punctuation-based merge rule. |
| FantasticLand (1) | Current app has an Audiobook with ISBN 9781543606249; no matching tracker title/type row in the fresh read. | Treat as an app-only candidate for later reviewed tracker addition, not evidence the app record should be deleted. Recheck target immediately before any append. |

## Recovered evidence

Current app metadata retains `_import.source_rows` IDs, including both original rows for the approved consolidations. Read-only database inspection confirms canonical Fable Steam/Wishlist and the corrected provider identity, SEGA Steam and FantasticLand Audiobook. Earlier imported decisions are reproducible from private recovery `build-final-local-packet.mjs`, `v14-final-local-packet-2026-10-11.private.json` and provider evidence under `/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/`. Do not use historical captured values as fresh authoritative data. They establish provenance/earlier approval only; fresh Supabase and new-tracker reads must supply all current values.

Historical original row numbers identify evidence in the import packet only. They MUST NOT become durable target row addresses: rows can move. Runtime mapping needs validated owner/library/item UUID plus target identity/provenance and must detect new ambiguity before execution. Do not introduce visible UUID columns without approval. No app identity or raw source capture belongs in public deployment credentials or client code.

## Completion boundary

14.0.42 fixes safe same-title release matching and formatted title reading. It does not yet persist the remaining provenance-based row mappings, execute duplicate cleanup, append missing rows, advance baselines or enable actual sync. Existing 14.0.41 field-choice persistence remains available. Apply disabled; nightly Off; Google token read-only; ordinary library mutations blocked in review-only validation.
