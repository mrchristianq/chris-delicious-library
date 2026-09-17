# Movie and TV metadata batches — 13.1.30

Updated the bound Google Apps Script project on 2026-09-15. These are spreadsheet
menu functions, not the deployed `doPost` web-app bridge.

## Root cause

Both old Next 50 functions scanned from row 2 on every invocation, selecting only
rows lacking TMDB_ID or RecommendedIDs. Empty recommendation responses therefore
kept early rows eligible indefinitely, while rows missing other metadata could be
skipped entirely. Each selected row ran the complete single-row updater, repeating
header/cell reads and individual progress toasts. Observed prior executions were
canceled, not confirmed credential failures.

## Live changes

- Movies.gs: `moviesUpdateNext50Rows` delegates to
  `cdlMetadataNext50_("Movies", moviesUpdateRows_, false)`.
- TVShowsMetadata.gs: `showsUpdateNext50Rows` delegates to
  `cdlMetadataNext50_("Shows", showsUpdateRows_, false)`.
- New `moviesRestartMetadataBatch` and `showsRestartMetadataBatch` call the same
  helper with `restart=true`; menus label these **Start metadata batch from selected row**.
- Both row updaters accept a fourth `options` argument, reuse `options.headers`,
  suppress per-row toasts/alerts when `options.quiet`, and return
  `{ processed, matched, recRows, errors, skipped }`. `skipped` counts blank titles.
- Each writer uses its own execution-local row snapshot to avoid reading cells
  already known to be populated. Blank candidates still use the original live
  cell read before writing. Existing blank-only writes and ChangeLog calls remain.
- The shared runner is currently appended to **Movies.gs**. Its exact source is
  archived in `apps-script-clean/MetadataBatch.gs`. Do NOT also add that file to
  the live project without first removing the helper from Movies.gs: define it once.
- Neither metadata source was previously tracked in this repository. Keep the
  live Movies.gs and TVShowsMetadata.gs when using the clean web-app replacements.

## Behavior and usage

Each sheet has a document-property cursor keyed by its sheet ID. First use starts
at the selected row if that sheet is active, otherwise row 2. Later clicks resume
the saved cursor, processing up to 50 consecutive physical rows, including blank
rows. Around three minutes, the runner stops between rows; one in-flight row can
extend that duration. Empty recommendations do not prevent forward progress.

A document lock prevents overlapping Movie/TV batch invocations. Cursor checkpoints
are written before work and after flushing each completed row. A failed row remains
the next row for retry; a no-match result advances but is listed for review. There
is no automatic wrap at the end of the sheet.

To revisit earlier rows, select a cell in the desired row on the relevant sheet,
choose **Start metadata batch from selected row**, then **Metadata Next 50 Rows**.
Do this after sorting or inserting/deleting rows too: the cursor is positional.
Do not sort/edit rows during a running batch. End summaries report processed,
matched, errors, review rows, and the next starting row.

These remain fill-missing-metadata actions. They do not refresh populated values
or overwrite user status, ratings, notes, watched dates, or episode progress.
No web-app deployment, credentials, triggers, or app save handlers were changed.

## Verification

`node scripts/test-metadata-batch.mjs` checks selected-row start, 50-row limit,
resuming, empty recommendations, reset, time budget, error checkpoints, end-of-sheet,
blank rows, and lock exclusion/release using mocked Apps Script services.
Both live sources were reread after a project reload and compared exactly with
the intended source (normalizing CRLF only); `onOpen` then completed successfully.

Live verification on September 15:

- Movies batch: 14:54:08–14:55:18; processed 50, matched 50, errors 0,
  next row 52.
- Shows batch: 14:55:44–14:56:55; processed 50, matched 50, errors 0,
  next row 52.

These counts mean rows processed/matched, not 50 changed records; already-filled
cells are intentionally preserved. No Git commit or push was made.
