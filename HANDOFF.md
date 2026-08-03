# Chris' Delicious Library Handoff

Last updated: 2026-08-02
Workspace: `/Volumes/MAC Drive/Codex/chris-delicious-library`
Branch: `dev`
HEAD before current uncommitted work: `359e30b Release version 13 Wrapped experience`
Current working version: `13.0.1`

## Current State

The production web/Tauri project is healthy and builds successfully. There is one complete but uncommitted fix in the working tree: the Wrapped TV episode slide no longer reports a false zero while TV episode history is still loading. The next requested feature is a broad Statistics-page typography pass; that work has not started.

Do not discard or overwrite the current working-tree changes. Review and preserve them before beginning new work.

## Completed In The Current Worktree

### Wrapped episode-history loading fix

The Wrapped episode slide previously rendered `0 episodes watched` when Wrapped opened before the `TV Episodes` data finished loading. The underlying Google Sheet data was present; this was a client startup race, not missing episode history.

Implemented behavior:

- Track episode-data state as `loading`, `ready`, or `error`.
- Treat cached/native episode rows as ready immediately.
- Mark episode data ready after a successful native snapshot or published-sheet CSV load.
- Mark the load as failed only when the CSV request fails and no cached rows exist.
- While loading, Wrapped displays `Episode history is syncing` and `Waiting for Google Sheets` instead of a false zero.
- If loading fails, Wrapped displays an unavailable/refresh message.
- Once ready, Wrapped displays the real episode count and runtime.

Observed browser result for 2026 during verification:

- `66 episodes watched`
- `47.9 hours`
- slide position `6 / 19`

### Version alignment

The app version was advanced from `13.0.0` to `13.0.1` in all required manifests:

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`
- in-app `APP_VERSION` and version history in `app/page.tsx`

## Current Architecture

### Application shell

- Next.js App Router application.
- `app/page.tsx` is the primary orchestration layer and currently contains much of the navigation, data loading, caching, Sheets synchronization, dialogs, media editing, and view coordination.
- The desktop native application is a Tauri wrapper under `src-tauri`.
- The separate SwiftUI Apple companion project is intentionally isolated at `/Volumes/MAC Drive/Codex/chris-delicious-library-apple`; do not mix its changes into this repository.

### Statistics and Wrapped

- Main component: `app/components/StatisticsView.tsx`.
- Receives normalized Books, Movies, TV Shows, Games, and TV Episode records from `app/page.tsx`.
- Owns Statistics calculations, media tabs, year filtering, Year in Review, and Wrapped slides.
- TV episode date policy already in the component:
  - newer watched records use `WatchedAt`;
  - historical records before the established cutover use `AirDate` so imported history is attributed sensibly.
- Wood Shelf theme must fall back to the light Statistics presentation; Statistics does not use wood styling.

### Data and synchronization

- Google Sheets is the durable source of truth.
- Published Google Sheet CSV endpoints provide read data and readback verification.
- Google Apps Script handles writes.
- A successful-looking write response is not enough: saves should be treated as durable only after Sheet/readback confirmation.
- A timed-out Apps Script request may still have written successfully; verify the Sheet before reporting failure.
- Native behavior is local-first: cached data appears quickly, queued writes synchronize, and confirmed state should only be shown after readback.
- TV episode rows are cached locally under `cdlTvEpisodeRows` and can also arrive through the native snapshot.

### Media and artwork

- Books, Movies, TV Shows, and Games share the main library shell but retain media-specific metadata, statuses, filters, and edit/save paths.
- R2 artwork is the displayed artwork source when available; metadata artwork is the default source used to refresh R2.
- Do not simplify or reverse R2 precedence without auditing all media types.

### Version rule

Every implemented code change requires a patch-version increment (`x.x.1`) unless the user explicitly requests a major/minor version. Keep the version synchronized across the package manifests, Tauri manifests, and in-app version history. Documentation-only edits do not require a version bump.

## Files Currently Changed

### `app/components/StatisticsView.tsx`

- Added optional `tvEpisodesStatus` prop.
- Added loading/error-aware Wrapped episode-slide copy.
- Prevented a false zero before episode history is ready.
- Updated Wrapped memo dependencies.

### `app/page.tsx`

- Bumped in-app version to `13.0.1`.
- Added the `13.0.1` version-history entry.
- Added `tvEpisodeDataStatus` state initialized from local cache.
- Updates status after native snapshot and CSV load outcomes.
- Passes episode-data status to `StatisticsView`.

### Version manifests

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`

All currently contain version `13.0.1`.

## Validation Already Completed

The current uncommitted Wrapped fix passed:

```bash
git diff --check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Browser verification also passed on a cold load:

1. Open Statistics.
2. Open Year in Review.
3. Start Wrapped.
4. Navigate to the episode slide.
5. Confirm the slide displays the real episode count rather than zero.

The Next.js build still prints existing noisy localStorage/SSR warnings. They did not fail the build and were not introduced by this fix.

## Unresolved Work

### Immediate next request: Statistics typography

The user wants all Statistics pages to use the largest readable typography possible without text clipping or overflowing modules. No typography edits have been made yet.

Required approach:

- Audit typography by component rather than applying one global scale.
- Increase:
  - page/header titles;
  - media tabs and year controls;
  - module titles;
  - At a Glance metric values and labels;
  - chart labels, axes, legends, and value annotations;
  - Year in Review and Wrapped supporting text;
  - Top Rated rank/rating captions and small metadata.
- Preserve intentional visual hierarchy.
- Do not allow long labels, titles, or values to clip.
- Check both the default Statistics dashboard and Year in Review.
- Verify desktop at wide and narrower widths, plus mobile/native responsive behavior.
- This code change should bump `13.0.1` to `13.0.2` across all version files and add a version-history entry.

### Known architectural risk

`app/page.tsx` is very large and owns many unrelated responsibilities. Keep changes tightly scoped. Avoid broad formatting or refactoring during visual adjustments because regressions can affect save reliability, navigation, and native behavior.

### Save reliability remains a standing requirement

Any future save changes must preserve:

- immediate optimistic feedback;
- durable Google Sheet confirmation;
- clear pending/failure state;
- no false success message;
- readback-aware handling of Apps Script timeouts;
- media-specific status and date normalization.

## Exact Next Steps

1. Read this file and inspect `git status` before editing.
2. Review the existing uncommitted Wrapped fix; do not recreate or remove it.
3. Open the styled JSX and Statistics markup in `app/components/StatisticsView.tsx`.
4. Inventory typography classes by section and identify current fixed heights/overflow rules.
5. Implement the typography pass in small groups: header, metrics, charts, Year in Review, Wrapped/Top Rated.
6. Test with the longest visible labels and titles at multiple viewport widths.
7. Bump all version locations from `13.0.1` to `13.0.2` and add the in-app history entry.
8. Run formatting/diff checks, Next build, and Tauri check.
9. Perform browser screenshots/visual verification on desktop and mobile.
10. Report any residual clipping or pre-existing warnings. Do not commit or push unless the user explicitly asks.

## Important Commands

Run from `/Volumes/MAC Drive/Codex/chris-delicious-library`.

```bash
# Inspect current state
git status --short
git diff --stat
git diff --check

# Start the development server
npm run dev

# Validate web production build
npm run build

# Validate Tauri/Rust
cargo check --manifest-path src-tauri/Cargo.toml

# Confirm synchronized versions
node -p "require('./package.json').version"
rg -n '13\.0\.[0-9]+' package.json package-lock.json app/page.tsx src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json
```

Development URL: `http://localhost:3000`

## Release and Git Decisions

- Current branch is `dev`.
- Current uncommitted changes must remain together because the code and version bump form one release unit.
- Do not reset, checkout, or revert files with user work.
- When asked to `commit and sync dev/main/native`, run the CDL release QA workflow, validate first, then commit, push `dev`, synchronize `main`, push `main`, and build/update native as requested.
- Vercel deployment normally follows the configured remote branch deployment flow; confirm deployment rather than assuming it.
- A native DMG should include the version number when a native release is built.

## Resume-Safely Checklist

- [ ] Confirm branch is `dev`.
- [ ] Confirm seven existing modified files plus this handoff are present.
- [ ] Confirm current version is `13.0.1`.
- [ ] Preserve the Wrapped episode-loading fix.
- [ ] Implement only the requested Statistics typography pass.
- [ ] Bump to `13.0.2` for that implementation.
- [ ] Run web, Tauri, and browser visual verification.
- [ ] Wait for an explicit commit/sync request before publishing.
