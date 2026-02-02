# Game Inset Settings - Save Fix

## Changes Made

### 1. Enhanced Error Handling
- Removed `mode: "no-cors"` from fetch requests to get proper error responses
- Added detailed console logging so you can see if settings are being saved

### 2. localStorage Backup
- Settings now automatically save to browser's `localStorage` as a backup
- If the Google Apps Script endpoint fails, settings persist locally during your session
- On page reload, settings are read from localStorage if they're not in the spreadsheet

### 3. Google Apps Script Enhancement
- Added proper CORS handling with `doOptions()` function
- Settings will save both to Google Sheet AND localStorage

## How to Update Your Google Apps Script

1. Go to your Google Apps Script editor (the script that handles the `NEXT_PUBLIC_SETTINGS_WRITE_URL`)
2. Replace the `doPost` function with the updated code from `GOOGLE_APPS_SCRIPT.gs` in this repository
3. The key change is adding explicit CORS support with a `doOptions` function

## Testing the Fix

### To verify game inset settings are saving:

1. Open your browser's Developer Console (F12 or Ctrl+Shift+J)
2. Go to Settings → Game Insets
3. Change any inset value
4. Check the console for messages like:
   - ✅ `Saved setting to sheet: PlatformInsetTopPx = 10` (saved to Google Sheet)
   - ✅ `Cached setting locally: PlatformInsetTopPx = 10` (saved to localStorage)
   - ❌ `Failed to save setting to sheet` (network error, but still cached locally)

### To verify settings persist:

1. Change a game inset value
2. Refresh the page
3. The setting should still be there (either from the sheet or localStorage)

## How Settings Priority Works

When loading settings, the app now:
1. First checks the Google Sheet (from CSV)
2. Falls back to localStorage if not found in sheet
3. Falls back to default value if not found anywhere

When saving settings:
1. Always saves to localStorage immediately (instant local persistence)
2. Also attempts to save to Google Sheet via the Apps Script
3. Even if the Google Apps Script fails, your settings are preserved locally
