const fs = require('fs');
const path = require('path');
const https = require('https');
const Papa = require('papaparse');

// CSV URLs from environment or hardcoded
const CSV_URLS = {
  tv: process.env.NEXT_PUBLIC_TV_CSV_URL || 'YOUR_TV_CSV_URL',
  books: process.env.NEXT_PUBLIC_BOOKS_CSV_URL || 'YOUR_BOOKS_CSV_URL', 
  movies: process.env.NEXT_PUBLIC_MOVIES_CSV_URL || 'YOUR_MOVIES_CSV_URL',
  games: process.env.NEXT_PUBLIC_GAMES_CSV_URL || 'YOUR_GAMES_CSV_URL'
};

const GITHUB_BASE_URL = 'https://mrchristianq.github.io/chris-delicious-library/covers';
const manifestPath = path.join(__dirname, '../public/covers-manifest.json');

// Sanitize title to match cover filename
function sanitizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
    .replace(/-+$/, '');
}

// Fetch CSV data
function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      });
    }).on('error', reject);
  });
}

// Download image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function syncNewCovers() {
  console.log('🔄 Starting cover sync...\n');

  // Load existing manifest
  let manifest = [];
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }

  // Create a Set of existing covers for quick lookup
  const existingCovers = new Set(manifest.map(item => item.filename));
  
  const newCovers = [];
  const stats = { downloaded: 0, skipped: 0, failed: 0 };

  // Process each category
  for (const [category, csvUrl] of Object.entries(CSV_URLS)) {
    if (csvUrl.includes('YOUR_')) {
      console.log(`⚠️  Skipping ${category} - CSV URL not configured`);
      continue;
    }

    console.log(`\n📊 Processing ${category}...`);
    
    try {
      const rows = await fetchCSV(csvUrl);
      console.log(`   Found ${rows.length} items in spreadsheet`);

      for (const row of rows) {
        const title = (row.Title || '').trim();
        if (!title) continue;

        // Get external poster URL based on category
        let posterUrl = '';
        if (category === 'tv' || category === 'movies') {
          posterUrl = (row.PosterURL || '').trim();
        } else if (category === 'books') {
          posterUrl = (row.ImageURL || row.CoverURL || row.PosterURL || '').trim();
        } else if (category === 'games') {
          posterUrl = (row.CoverURL || row.PosterURL || '').trim();
        }

        if (!posterUrl || posterUrl.includes('#REF!') || posterUrl === 'N/A') {
          continue; // Skip items without valid cover URLs
        }

        const sanitized = sanitizeTitle(title);
        const filename = `${category}/${sanitized}.jpg`;
        const filepath = path.join(__dirname, '../public/covers', filename);

        // Skip if already exists
        if (existingCovers.has(filename)) {
          stats.skipped++;
          continue;
        }

        // Create category directory if needed
        const categoryDir = path.dirname(filepath);
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true });
        }

        // Download the cover
        try {
          await downloadImage(posterUrl, filepath);
          console.log(`   ✅ Downloaded: ${sanitized}.jpg`);
          
          // Add to manifest
          newCovers.push({
            title,
            filename,
            url: posterUrl
          });
          
          stats.downloaded++;
        } catch (err) {
          console.log(`   ❌ Failed: ${title} - ${err.message}`);
          stats.failed++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error(`   ❌ Error processing ${category}: ${err.message}`);
    }
  }

  // Update manifest if we have new covers
  if (newCovers.length > 0) {
    const updatedManifest = [...manifest, ...newCovers];
    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2));
    console.log(`\n📝 Updated manifest with ${newCovers.length} new covers`);

    // Generate update CSVs
    generateUpdateCSVs(newCovers);
  }

  // Print summary
  console.log(`\n✨ Sync complete!`);
  console.log(`   Downloaded: ${stats.downloaded}`);
  console.log(`   Skipped (already exists): ${stats.skipped}`);
  console.log(`   Failed: ${stats.failed}`);
  
  if (stats.downloaded > 0) {
    console.log(`\n🎯 Next steps:`);
    console.log(`   1. Review new covers in /public/covers/`);
    console.log(`   2. Commit and push changes: git add . && git commit -m "Add new covers" && git push`);
    console.log(`   3. Import CSVs from github-urls-output/ to update spreadsheets with GitHubCoverURLs`);
  }
}

function generateUpdateCSVs(newCovers) {
  const outputDir = path.join(__dirname, '../github-urls-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Group by category
  const byCategory = {};
  newCovers.forEach(cover => {
    const match = cover.filename.match(/^(books|movies|tv|games)\//);
    if (match) {
      const category = match[1];
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push({
        title: cover.title,
        githubUrl: `${GITHUB_BASE_URL}/${cover.filename}`
      });
    }
  });

  // Write CSV files
  Object.keys(byCategory).forEach(category => {
    const items = byCategory[category];
    const csvLines = ['Title,GitHubCoverURL'];
    items.forEach(item => {
      const escapedTitle = item.title.replace(/"/g, '""');
      const titleField = item.title.includes(',') ? `"${escapedTitle}"` : escapedTitle;
      csvLines.push(`${titleField},${item.githubUrl}`);
    });

    const filename = `${category}-new-github-urls.csv`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, csvLines.join('\n'));
    console.log(`   📄 Generated ${filename} (${items.length} new covers)`);
  });
}

// Run the sync
syncNewCovers().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
