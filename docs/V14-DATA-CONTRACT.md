# v14 compatibility contract

2026-10-12 — implementation specification. Version 14.0.5 adds a pure item-row projection in app/lib/v14/legacy-row.ts with synthetic contract tests. It is not wired to the UI or a snapshot RPC. Identity is returned separately and still needs explicit propagation through the original parsers. Episodes, settings resolution, complete authenticated snapshots, and full parser/fixture parity remain pending. The projection is not an authorization boundary.

## Purpose

Give the existing v13 app the same rendering inputs and mutation outcomes from Supabase. Do not pass the diagnostic toRatingItem helper into the whole application: it assigns Status for every media type, which would overwrite TV production status and movie release status with user progress.

## Snapshot boundary

### 14.0.7 checkpoint (2026-10-13)

- Added owner-scoped single-statement snapshot RPC, internal authenticated reader, episode/settings mutation RPCs, and fresh-readback server helpers. These are not connected to the v13 UI yet.
- SQL migrations tested in disposable network-disabled PostgreSQL. All six SQL suites and a real two-connection episode-write race passed. Fixtures are destroyed after each run; the populated remote test project is not a test-fixture target.
- 45 JavaScript tests pass, including actual v13 parser source equality and four-media rendering-input fixtures. Full offline import projection accepted 2,337 items, 3,229 episodes, 664 settings and preserved 1,400 unknown-progress episodes. This is not a full visual parity claim.
- Targeted lint, TypeScript, production build, Rust check and whitespace check passed.
- Remote checkpoint completed 2026-10-13: schema/data backup restored successfully into isolated local PostgreSQL before applying migrations 004–006 to test project xnitocbxdpikvfxssbvm. One transaction recorded migration history and compared item/progress/settings/audit/outbox fingerprints before and after; no changes to these records were accepted. Private recovery files: pre-1407-TlLMzf inside the existing recovery directory. No credentials/auth account backup is claimed; local restore used an ID-only owner stub. Historical activity, complete mutation coverage, browser identity propagation and visual integration remain pending. No normal UI has been switched to these functions.
- An independent lighter-agent review identified the unset-status case; it now stays blank. Its claimed missing date aliases were already present. Superseded episode receipts deliberately do not claim current readback confirmation.

14.0.6: `library-snapshot.ts` now validates and projects an in-memory item/episode/settings snapshot, rejects duplicate/foreign/orphaned records and count mismatches, and retains consumer-specific setting profiles. Synthetic tests cover unknown versus false episode progress and cleared settings. This is NOT the authenticated reader: the consistent database RPC/change-token implementation, historical activity/collections, live read verification, and wiring to the original UI remain pending. No remote migration was applied. Runtime ownership checks in the projection do not replace database authorization, and counts alone do not establish transactional consistency.

An authenticated read must return one complete, owner-scoped library snapshot: items/metadata/identifiers, episodes with optional progress, effective settings, ordered collections and historical activity. Include library ID, a schema version, server observation time and a consistent change token. A maximum item revision is NOT an adequate library token: it misses changes to other items, settings and episodes. Token design requires explicit database implementation and tests.

Do not expose import provenance/raw rows unnecessarily. No service credentials reach the client. A new authenticated request must check owner access, not trust a client-supplied library ID. Cache keys include owner and library; sign-out clears held data.

Internal transport chunking is allowed, but a partial set is not presented as a complete library. If multiple reads are necessary, their consistency must be checked before exposing the assembled snapshot. Reuse v13's full-library filtering/sorting rather than introducing screen pagination.

## Compatibility projection

Start with approved metadata, overlay user-owned fields, then explicitly override every alias of canonical fields. Use presence/null checks, not truthiness. Never resurrect an old imported value because the canonical value is empty or zero.

| Canonical value | Books | Movies | TV | Games |
| --- | --- | --- | --- | --- |
| title | Title | Title | Title | Title |
| user_status | Status | Watch Status / WatchStatus / Watched | WatchStatus / Watched | Status / PlayStatus / Completed |
| personal_rating | My Rating / MyRating | MyRating / My Rating | MyRating | My Rating |
| completed_on | Completed Date / Date Completed / CompletedDate | WatchDate / Watch Date / Date Watched | Completed Date / Date Completed / Completd Date / CompletdDate / CompletedDate | Completed Date / Date Completed |
| notes | Notes / notes | Notes / notes | Notes / notes | Notes / notes |

The slash-separated aliases describe fields to normalize coherently, not fallback sources that may override a cleared canonical value. Boolean-style Watched/Completed aliases require their existing status semantics; do not indiscriminately write the same text to unrelated fields. TV Status remains series production metadata. Movie Status remains movie metadata. Preserve independent game platform editions.

Keep ratings on existing scales. Personal book ratings are 0–5; other personal ratings are 0–10. External ratings retain their provider/source semantics. Display normalization is not a database mutation.

Dates are calendar dates, serialized without timezone shifts. Approved imported spreadsheet serials must be normalized by an explicit date-field mapping, not guessed for every numeric field. Invalid dates are surfaced as data issues, not replaced with release dates or today's date.

Preserve artwork fields and the existing display resolver. Do not substitute the simplified diagnostic itemCover priority for v13's cover override/R2 logic. Preserve whitespace/newlines in notes; render as plain text through existing full details/Gallery only.

## Stable identity

Attach a non-rendered identity envelope to each projected item: database item ID, library ID and revision. Propagate it through row parsers, spreads, selection, related-item navigation, edit forms and pending operations. Proposed internal name: __cdlIdentity. Do not replace legacy visual/order keys until explicit compatibility tests cover their saved settings.

All mutations require database identity and expected revision. Never fall back to title, ISBN, provider ID or array index when database identity is missing. Multiple editions can share provider IDs. Report an identity error rather than choosing a record.

## Episodes

Each projected episode carries its database episode ID, parent show ID and optional progress revision. A missing progress record means unknown, not an explicit false. Explicit false, true and watched_at must survive mapping and reopen. Metadata refresh cannot overwrite progress.

Bulk operations enumerate the stable target episode IDs and revisions before submission. Return per-record outcomes and verify all requested records before reporting complete success. A concurrent user edit is a conflict, not permission to retry overwriting it.

## Settings and ordering

Resolve imported settings according to the existing consumers: first-match general settings versus last-valid iteration for relevant artwork/popup keys. Retain imported duplicate provenance privately. Do not collapse all duplicates with one universal rule.

Separate account/library settings from device-only viewport preferences. Test namespace includes backend, owner and library. Offer no silent local preference reset or overwriting of the v13 namespace. Existing manual order keys need an explicit legacy-key-to-database-ID mapping; do not sort by title or database arrival order as a substitute.

## Mutation boundary

14.0.8 local checkpoint: `edit-contract.ts` maps all literal existing Edit/modal metadata-selection fields to canonical fields or manual overrides. `save-full-edit.ts` and its internal server helper require stable identity, expected revision and fresh independent readback. Migration 007 provides atomic edit/audit/outbox with a media-specific override allowlist, owner checks and retry handling. Tested against disposable PostgreSQL, including duplicate title/ISBN isolation. Migration 007 is NOT applied remotely and the existing forms are NOT wired to it. Add/delete, artwork side effects, metadata refresh, activity and remaining integration coverage are still pending. Source allowlist coverage does not prove end-to-end form behavior.

Every mutation envelope contains request ID, operation kind, stable target and expected revision where applicable. Validate allowed fields per operation and media type on the server. Distinguish omitted fields (unchanged), null/empty values (intentional clear where allowed), zero and false.

Operations to implement separately:

- Create media item, including manual entry and edition identity.
- Edit media fields and Rate It; metadata changes separate from user-owned fields.
- Delete/restore policy with audit; no implied tracker deletion.
- Set episode progress and bulk progress.
- Save settings, smart-list definitions and collection order.
- Associate/upload artwork and metadata refresh results safely.
- Refresh recommendations without overwriting user fields.

Commit value changes, audit and pending tracker export record atomically where applicable. Retrying an identical request ID returns its recorded outcome; reusing an ID with different input fails. Stale revision returns a conflict with fresh data. A timeout is ambiguous until request status/readback resolves it. Confirmation reads authoritative canonical fields, not the optimistic state.

No regular app mutation contacts Google Sheets. Tracker export is a later, separate manual/nightly process. No new tracker UI or success wording is authorized here.

## Required contract cases

1. Same logical item through baseline CSV parsing and projection yields equal rendering fields (except approved import corrections and hidden identity).
2. Cleared note/date/rating stays clear despite populated legacy aliases.
3. Personal rating zero and episode watched false remain explicit values.
4. TV Pending Release survives reopen while series Status remains unchanged.
5. Two same-title game editions and duplicate ISBN books edit only the requested UUID.
6. All cover overrides, 3D preferences, themes and ordering resolve to the original effective values.
7. No progress record remains unknown; metadata refresh preserves explicit progress.
8. Other-owner IDs, cross-library IDs, malformed fields, stale revisions and reused request IDs fail safely.
9. Interrupted/multi-record saves never claim full confirmation from a partial result.
10. Network destination audit shows no original Sheet or Apps Script access from normal v14 flows.

## Visual baseline capture protocol

Use an isolated copy of exact reference commit 79524e8 with deterministic fixture feeds and no production write credentials. Block outbound mutations and automatic refresh side effects before the page loads; browser-only blocking is insufficient for server-side requests. Do not use a live production session for theme or preference changes.

Record fixture hash, reference commit, OS/browser/version, viewport/device scale, theme, preferences and interaction state with each screenshot. Compare equivalent data—not the current cleaned test library against a different production snapshot. Freeze date-dependent fixtures and finish font/image loading before capture; stabilize animations without altering final styles.

Capture Home, four media dashboards, Cover/List/Shelf, both 3D states, Upcoming, each queue/watchlist, Completed themes/filters, all four full details, compact sidebar, Add/Edit/Rate, TV episode controls, statistics/Year in Review, Smart Lists/Discover and settings/mobile menus. Exercise desktop and narrow mobile layouts. Include keyboard/focus and scrolling behavior; screenshots alone do not prove functionality.

Current evidence: source ownership and contracts inspected; screenshots and fixture parity tests pending. This is not a completed visual baseline or a migrated application.
# v14.0.10 — retry-safe creation (local only)

`prepareCreate` maps the existing editor values through the full-edit contract,
including the current game Wishlist/Digital defaults and book Physical/Owned
defaults. Notes remain multiline; ratings and dates retain the existing validation.
The caller must retain the prepared payload, item UUID and request UUID across
retries, rather than regenerate them after a timeout. Submitted editor fields are
stored as overrides; this does not yet import additional provider search-response
metadata or build the normalized provider-identifier registry.

Migration 009 creates an item and applies the full-edit validator in one atomic
transaction. Its first visible revision is 2 (seed plus validated form application).
There is exactly one creation audit entry and one pending outbox entry. Reusing a
request for different content fails; an identical retry returns the original
receipt. Different platform editions sharing a title/provider ID remain independent.
Independent readback is required before the internal helper returns confirmed.

This migration is NOT applied remotely and the Add screens are NOT wired yet.
R2 cover synchronization, provider metadata orchestration, browser retry-state
retention and existing-screen integration remain pending. No Sheet writes, live
data changes, visual redesign, commit, push or deployment occurred.

# v14.0.9 — recoverable deletion (local only)

The existing Delete entry points remain visually unchanged and are not yet wired
to this backend. `cdl_v14_set_archived` targets an owner-scoped UUID with an
expected revision and retry request ID. It sets or clears `deleted_at`, increments
the revision, and records the change atomically. Metadata, identifiers, episode
progress and collection membership remain stored for recovery. The existing
snapshot excludes archived items and their episodes.

Confirmation uses the separate owner-scoped `cdl_v14_archive_state` read; a missing
item in the library is not sufficient proof of a successful deletion. Restore is
also revision-checked. Neither operation automatically deletes a tracker row or
queues a Sheet deletion. Tracker deletion/conflict policy remains a separate sync
gate. No new restore UI has been introduced.

Migration 008, like migration 007, is local only. Synthetic database tests cover
archive, restore, duplicate titles, retry identity, stale revisions, unauthorized
access, retained episode progress and absence of tracker writes. Add creation,
runtime UI wiring, browser persistence testing, and complete visual parity remain
unfinished. No production changes, commit, push or deployment were performed.
