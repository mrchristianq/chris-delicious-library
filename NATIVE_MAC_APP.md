# Native Mac App

This repo now contains the foundation for a local-first Tauri 2 macOS app.

## Current Shape

- Web mode remains the existing Next.js app backed by Google Sheets, Apps Script, and R2.
- Native mode is enabled with `NEXT_PUBLIC_NATIVE_APP=true`.
- Native data lives in app support through Tauri commands:
  - `library.sqlite`
  - local rows/settings/roadmap JSON stored in SQLite
  - queued sheet writes stored in `sync_queue`

## Commands

```bash
npm run dev
npm run build
npm run build:native-renderer
npm run dev:native
npm run build:native
```

Rust is required for `dev:native` and `build:native`.

## Offline Behavior

On native launch, the app first tries to load the local SQLite snapshot. If no local snapshot exists, it seeds SQLite from the configured Google Sheet CSV URLs. After that, browsing, settings reads, and queued writes can survive offline restarts.

External metadata search still requires internet for v1.

## Sync Policy

Queued native writes include a client timestamp and are stored locally first. `sync_now` pushes queued sheet writes and pending R2 asset uploads when the network is available. A native refresh pulls the published Google CSV snapshot back into SQLite after pending writes are clear. Local rows/settings with pending offline edits are preserved during that pull so a remote refresh does not wipe unsynced local work.

For conflict handling, pulled rows keep their remote `LastModifiedAt` metadata even when a local pending edit is preserved. Before a queued native write is pushed, the native sync layer compares the queued `ClientUpdatedAt` to the stored remote timestamp. If the remote timestamp is newer, the queued native write is marked skipped so the Mac app does not overwrite the newer web edit.
