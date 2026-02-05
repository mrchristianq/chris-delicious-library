const fs = require('fs');
const https = require('https');
const Papa = require('papaparse');

// Load environment variables from .env.local
const envPath = require('path').join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

// Sanitize title to match cover filename (must match app logic)
function sanitizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars (keep spaces and hyphens)
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .substring(0, 50);
}

// Generate GitHub cover URL
function getGitHubCoverUrl(title, category) {
  const sanitized = sanitizeTitle(title);
  return `https://mrchristianq.github.io/chris-delicious-library/covers/${category}/${sanitized}.jpg`;
}

// Fetch CSV data from URL
async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        Papa.parse(data, {
          header: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      });
    }).on('error', reject);
  });
}

// Process category and generate CSV
async function processCategory(name, category, csvUrl, idField, additionalFields = []) {
  console.log(`\n📊 Processing ${name}...`);
  
  if (!csvUrl) {
    console.log(`   ⚠️  Skipping ${name} - CSV URL not configured`);
    return null;
  }

  try {
    const data = await fetchCSV(csvUrl);
    const rows = [];

    for (const row of data) {
      const title = row['Title']?.trim();
      const uniqueId = row[idField]?.trim();
      
      if (!title || !uniqueId || uniqueId === '#REF!' || uniqueId === 'N/A') {
        continue;
      }

      const gitHubCoverUrl = getGitHubCoverUrl(title, category);
      
      const outputRow = {
        [idField]: uniqueId,
        Title: title,
        GitHubCoverURL: gitHubCoverUrl
      };

      // Add any additional fields
      additionalFields.forEach(field => {
        if (row[field]) {
          outputRow[field] = row[field].trim();
        }
      });

      rows.push(outputRow);
    }

    console.log(`   ✅ Found ${rows.length} items with valid ${idField}`);
    return rows;

  } catch (error) {
    console.error(`   ❌ Error processing ${name}:`, error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('🔄 Generating cover URL CSV files with unique identifiers...\n');

  const outputDir = require('path').join(__dirname, '../github-urls-with-ids-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const categories = [
    {
      name: 'TV Shows',
      category: 'tv',
      csvUrl: process.env.NEXT_PUBLIC_TV_SHEET_CSV_URL,
      idField: 'TMDB_ID',
      filename: 'tv-github-urls-with-tmdb.csv',
      additionalFields: ['WatchStatus', 'Status']
    },
    {
      name: 'Books',
      category: 'books',
      csvUrl: process.env.NEXT_PUBLIC_BOOKS_SHEET_CSV_URL,
      idField: 'ISBN',
      filename: 'books-github-urls-with-isbn.csv',
      additionalFields: ['Status', 'Series']
    },
    {
      name: 'Movies',
      category: 'movies',
      csvUrl: process.env.NEXT_PUBLIC_MOVIES_SHEET_CSV_URL,
      idField: 'TMDB_ID',
      filename: 'movies-github-urls-with-tmdb.csv',
      additionalFields: ['WatchStatus', 'Status']
    },
    {
      name: 'Games',
      category: 'games',
      csvUrl: process.env.NEXT_PUBLIC_GAMES_SHEET_CSV_URL,
      idField: 'IGDB_ID',
      filename: 'games-github-urls-with-igdb.csv',
      additionalFields: ['Platform', 'PlayStatus', 'Status']
    }
  ];

  const results = {};

  for (const cat of categories) {
    const rows = await processCategory(
      cat.name,
      cat.category,
      cat.csvUrl,
      cat.idField,
      cat.additionalFields
    );

    if (rows && rows.length > 0) {
      const csv = Papa.unparse(rows);
      const outputPath = require('path').join(outputDir, cat.filename);
      fs.writeFileSync(outputPath, csv);
      console.log(`   💾 Saved to ${cat.filename}`);
      results[cat.name] = rows.length;
    }
  }

  console.log('\n✨ Generation complete!\n');
  console.log('📊 Summary:');
  Object.entries(results).forEach(([name, count]) => {
    console.log(`   ${name}: ${count} items`);
  });
  console.log(`\n📁 Files saved to: ${outputDir}`);
  console.log('\n📝 Next steps:');
  console.log('   1. Open each CSV file in the output folder');
  console.log('   2. In your Google Sheet, add a new column "GitHubCoverURL"');
  console.log('   3. Use VLOOKUP to match by ID and populate the column:');
  console.log('      Example: =VLOOKUP(A2, ImportRange("[CSV_URL]", "A:C"), 3, FALSE)');
  console.log('   4. Or manually copy/paste the GitHubCoverURL column matching by ID');
}

main().catch(console.error);
