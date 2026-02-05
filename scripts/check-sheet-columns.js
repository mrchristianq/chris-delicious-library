const https = require('https');
const Papa = require('papaparse');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = require('path').join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
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

async function checkColumns(name, url) {
  console.log(`\n📊 ${name}:`);
  if (!url) {
    console.log('   ⚠️  URL not configured');
    return;
  }

  try {
    const data = await fetchCSV(url);
    if (data.length > 0) {
      const firstRow = data[0];
      const columns = Object.keys(firstRow);
      console.log(`   Columns: ${columns.join(', ')}`);
      console.log(`   Total rows: ${data.length}`);
      
      // Show first row sample
      console.log('   Sample data:');
      columns.slice(0, 5).forEach(col => {
        console.log(`      ${col}: ${firstRow[col] || '(empty)'}`);
      });
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Checking spreadsheet columns...\n');
  
  await checkColumns('TV Shows', process.env.NEXT_PUBLIC_TV_SHEET_CSV_URL);
  await checkColumns('Books', process.env.NEXT_PUBLIC_BOOKS_SHEET_CSV_URL);
  await checkColumns('Movies', process.env.NEXT_PUBLIC_MOVIES_SHEET_CSV_URL);
  await checkColumns('Games', process.env.NEXT_PUBLIC_GAMES_SHEET_CSV_URL);
}

main().catch(console.error);
