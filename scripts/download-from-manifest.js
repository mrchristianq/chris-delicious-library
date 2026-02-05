const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Read the manifest file
const manifestPath = path.join(__dirname, '../public/covers-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log(`📦 Loaded manifest with ${manifest.length} covers`);

// Stats
let downloaded = 0;
let skipped = 0;
let failed = 0;

// Download a single image
async function downloadImage(item) {
  const { title, filename, url } = item;
  
  // Skip invalid URLs (spreadsheet errors, etc.)
  if (!url || url.includes('#REF!') || url === 'N/A' || url.trim() === '') {
    console.log(`⏭️  Skipping (invalid URL): ${title}`);
    skipped++;
    return;
  }
  
  const outputPath = path.join(__dirname, '../public/covers', filename);
  
  // Check if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  Skipping (exists): ${filename}`);
    skipped++;
    return;
  }
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(outputPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          downloaded++;
          console.log(`✅ Downloaded [${downloaded}/${manifest.length}]: ${filename}`);
          resolve();
        });
      } else {
        console.error(`❌ Failed (${response.statusCode}): ${title} - ${url}`);
        failed++;
        resolve();
      }
    }).on('error', (err) => {
      console.error(`❌ Error downloading ${title}: ${err.message}`);
      failed++;
      resolve();
    });
  });
}

// Process downloads with concurrency limit
async function processQueue(items, concurrency = 10) {
  const queue = [...items];
  const workers = [];
  
  for (let i = 0; i < concurrency; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item) {
            await downloadImage(item);
          }
        }
      })()
    );
  }
  
  await Promise.all(workers);
}

// Main execution
(async () => {
  console.log('🚀 Starting download process...\n');
  
  const startTime = Date.now();
  await processQueue(manifest, 10); // 10 concurrent downloads
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n📊 Download Summary:');
  console.log(`   ✅ Downloaded: ${downloaded}`);
  console.log(`   ⏭️  Skipped (existing): ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏱️  Duration: ${duration}s`);
  console.log(`\n🎉 Done! Covers saved to public/covers/`);
})();
