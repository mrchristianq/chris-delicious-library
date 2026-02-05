/**
 * Cover Download Script
 * Downloads all covers from spreadsheets and saves them locally
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

// Environment variables - your CSV URLs
const TV_CSV_URL = process.env.NEXT_PUBLIC_TV_SHEET_CSV_URL;
const BOOKS_CSV_URL = process.env.NEXT_PUBLIC_BOOKS_SHEET_CSV_URL;
const MOVIES_CSV_URL = process.env.NEXT_PUBLIC_MOVIES_SHEET_CSV_URL;
const GAMES_CSV_URL = process.env.NEXT_PUBLIC_GAMES_SHEET_CSV_URL;

const OUTPUT_DIR = path.join(__dirname, '../public/covers');

// Helper to create clean filename from title
function cleanFilename(title, id) {
  if (!title) return `unknown-${id}`;
  
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Remove multiple hyphens
    .substring(0, 50);             // Limit length
}

// Helper to download image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    if (!url || url.trim() === '') {
      console.log(`  ⚠️  Skipping - no URL`);
      return resolve({ skipped: true });
    }

    const file = fs.createWriteStream(filepath);
    const client = url.startsWith('https') ? https : http;

    client.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        fs.unlinkSync(filepath);
        return reject(new Error(`Failed to download: ${response.statusCode}`));
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(filepath);
        resolve({ size: stats.size, success: true });
      });
    }).on('error', (err) => {
      fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

// Helper to fetch and parse CSV
async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      console.log('  ⚠️  No URL provided');
      return resolve([]);
    }

    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        Papa.parse(data, {
          header: true,
          complete: (results) => resolve(results.data),
          error: reject
        });
      });
    }).on('error', reject);
  });
}

// Process a category
async function processCategory(csvUrl, category, posterKey) {
  console.log(`\n📚 Processing ${category}...`);
  
  const data = await fetchCSV(csvUrl);
  const outputPath = path.join(OUTPUT_DIR, category);
  
  // Debug: Show first item keys
  if (data.length > 0) {
    console.log(`  📋 CSV Columns:`, Object.keys(data[0]).join(', '));
    console.log(`  📊 Total rows: ${data.length}`);
  }
  
  let downloaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const title = item.Title || item.title;
    const posterUrl = item[posterKey] || item.PosterURL || item.posterUrl || item.ImageURL;

    if (!title || !posterUrl || posterUrl.trim() === '') {
      if (i < 5) console.log(`  ⏭️  ${i + 1} - Skipping (title: "${title}", hasURL: ${!!posterUrl})`);
      skipped++;
      continue;
    }

    const filename = cleanFilename(title, i);
    const ext = posterUrl.includes('.webp') ? '.webp' : 
                posterUrl.includes('.png') ? '.png' : '.jpg';
    const filepath = path.join(outputPath, filename + ext);

    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`  ⏭️  ${i + 1}/${data.length} - ${title} (already exists)`);
      skipped++;
      continue;
    }

    process.stdout.write(`  ⬇️  ${i + 1}/${data.length} - ${title}...`);

    try {
      const result = await downloadImage(posterUrl, filepath);
      if (result.skipped) {
        skipped++;
        console.log(' skipped');
      } else {
        downloaded++;
        const sizeKB = (result.size / 1024).toFixed(1);
        console.log(` ✅ (${sizeKB}KB)`);
      }
    } catch (err) {
      errors++;
      console.log(` ❌ ${err.message}`);
    }

    // Small delay to avoid overwhelming servers
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n  Summary: ${downloaded} downloaded, ${skipped} skipped, ${errors} errors`);
  return { downloaded, skipped, errors };
}

// Main function
async function main() {
  console.log('🎬 Cover Download Script Starting...\n');
  console.log('Output directory:', OUTPUT_DIR);

  const results = {
    movies: { downloaded: 0, skipped: 0, errors: 0 },
    tv: { downloaded: 0, skipped: 0, errors: 0 },
    books: { downloaded: 0, skipped: 0, errors: 0 },
    games: { downloaded: 0, skipped: 0, errors: 0 }
  };

  // Download all categories
  results.movies = await processCategory(MOVIES_CSV_URL, 'movies', 'PosterURL');
  results.tv = await processCategory(TV_CSV_URL, 'tv', 'PosterURL');
  results.books = await processCategory(BOOKS_CSV_URL, 'books', 'ImageURL');
  results.games = await processCategory(GAMES_CSV_URL, 'games', 'PosterURL');

  // Final summary
  console.log('\n\n🎉 Complete!');
  console.log('═══════════════════════════════════════');
  
  const total = Object.values(results).reduce((acc, cat) => ({
    downloaded: acc.downloaded + cat.downloaded,
    skipped: acc.skipped + cat.skipped,
    errors: acc.errors + cat.errors
  }), { downloaded: 0, skipped: 0, errors: 0 });

  console.log(`Total Downloaded: ${total.downloaded}`);
  console.log(`Total Skipped: ${total.skipped}`);
  console.log(`Total Errors: ${total.errors}`);
  console.log('═══════════════════════════════════════\n');
}

// Run
main().catch(console.error);
