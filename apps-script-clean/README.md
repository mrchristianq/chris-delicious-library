# Clean Google Apps Script Files

These files are safe replacement sources for the Apps Script project. They are split so the spreadsheet menu and the web app do not overwrite each other.

## Replace these Apps Script files

1. Replace `WebApp.gs` with `apps-script-clean/WebApp.gs`.
2. Replace `Menu.gs` with `apps-script-clean/Menu.gs`.
3. Replace `ChangeLogBridge.gs` with `apps-script-clean/ChangeLogBridge.gs`.
4. Replace `TMDB.gs` with `apps-script-clean/TMDB.gs` only if your live `TMDB.gs` currently contains the duplicate web-app bridge.

## Keep these existing Apps Script files unchanged

- `Books.gs`
- `Movies.gs`
- `GamesIGDB.gs`
- `R2Sync.gs`
- `TVShowsMetadata.gs`
- `Changelog.gs`
- `Debug.gs`
- `CoverSync_old.gs`, if you still keep it for history

## Required sanity check before deploy

Use Apps Script search and confirm:

- `function doPost` appears once, only in `WebApp.gs`.
- `function doOptions` appears once, only in `WebApp.gs`.
- `function createCORSResponse` appears once, only in `WebApp.gs`.
- `function onOpen` appears once, only in `Menu.gs`.
- `function safeCall_` appears once, only in `Menu.gs`.
- `function appendChangeLogRows_` appears once, only in `ChangeLogBridge.gs`.

After deploy, test the web app with the action `debugWebAppVersion`. The response should include `10.2.18-clean-webapp`.
