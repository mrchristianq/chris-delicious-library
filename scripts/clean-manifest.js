const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../public/covers-manifest.json');
const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const clean = data.filter(item => {
  return item.url && 
         item.url.indexOf('#REF!') === -1 && 
         item.url !== 'N/A' && 
         item.url.trim() !== '';
});

fs.writeFileSync(manifestPath, JSON.stringify(clean, null, 2));

console.log(`✅ Cleaned manifest: ${data.length} → ${clean.length} items`);
console.log(`❌ Removed: ${data.length - clean.length} invalid URLs`);
