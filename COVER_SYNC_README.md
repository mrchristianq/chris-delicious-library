# Automated Cover Sync System

This system automatically downloads new cover images from your Google Sheets and updates them on GitHub Pages.

## How It Works

1. **You add a new item** to any Google Sheet (Books, Movies, TV, Games) with a `PosterURL` or `CoverURL`
2. **The sync script runs** (manually or automatically via GitHub Actions)
3. **New covers are downloaded** to `/public/covers/{category}/`
4. **Manifest is updated** with the new cover references
5. **CSV files are generated** with `GitHubCoverURL` values for each new item
6. **You import the CSVs** into your Google Sheets to add the GitHub URLs

## Manual Sync (When You Add Items)

Run this command whenever you add new items to your spreadsheets:

```bash
npm run sync-covers
```

This will:
- ✅ Scan all your Google Sheets for new items
- ✅ Download covers that don't exist yet in `/public/covers/`
- ✅ Generate update CSVs in `/github-urls-output/`
- ✅ Update the manifest

Then commit and push:

```bash
git add .
git commit -m "Add new covers from sync"
git push origin dev
```

## Automated Sync (GitHub Actions)

### Option 1: Manual Trigger
1. Go to **Actions** tab in GitHub
2. Select **"Sync New Covers"** workflow
3. Click **"Run workflow"**
4. The workflow will create a Pull Request with any new covers

### Option 2: Scheduled (Daily)
The workflow automatically runs **every day at 2 AM UTC** to check for new items.

If new covers are found, it will:
- Create a Pull Request with the changes
- Include CSV files for updating your spreadsheets
- You review, import CSVs, and merge the PR

## Updating Google Sheets

After new covers are synced, import the CSVs:

1. **Open the CSV** from `github-urls-output/{category}-new-github-urls.csv`
2. **In Google Sheets**, add a `GitHubCoverURL` column if it doesn't exist
3. **Use VLOOKUP** or manually paste the URLs matching by Title
4. **Now your app** will use the GitHub-hosted covers automatically!

## Environment Variables (For GitHub Actions)

Add these secrets in GitHub Settings → Secrets and variables → Actions:

- `NEXT_PUBLIC_TV_CSV_URL` - Your TV shows Google Sheet CSV URL
- `NEXT_PUBLIC_BOOKS_CSV_URL` - Your books Google Sheet CSV URL  
- `NEXT_PUBLIC_MOVIES_CSV_URL` - Your movies Google Sheet CSV URL
- `NEXT_PUBLIC_GAMES_CSV_URL` - Your games Google Sheet CSV URL

## Files

- `scripts/sync-new-covers.js` - Main sync script
- `.github/workflows/sync-covers.yml` - GitHub Actions workflow
- `github-urls-output/` - Generated CSV files with GitHub URLs
- `public/covers/` - All downloaded cover images
- `public/covers-manifest.json` - Master list of all covers

## Workflow Summary

```
Add item to Google Sheets (with PosterURL)
    ↓
Run sync (manual: npm run sync-covers, or automatic: GitHub Actions)
    ↓
New covers downloaded to /public/covers/
    ↓
CSV generated with GitHubCoverURL
    ↓
Import CSV to Google Sheets
    ↓
App automatically uses GitHub covers!
```
