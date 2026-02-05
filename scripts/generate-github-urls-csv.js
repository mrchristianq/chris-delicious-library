const fs = require('fs');
const path = require('path');

// Read the manifest
const manifestPath = path.join(__dirname, '../public/covers-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const baseUrl = 'https://mrchristianq.github.io/chris-delicious-library/covers';

// Group covers by category
const categories = {
  books: [],
  movies: [],
  tv: [],
  games: []
};

manifest.forEach(item => {
  const match = item.filename.match(/^(books|movies|tv|games)\//);
  if (match) {
    const category = match[1];
    const githubUrl = `${baseUrl}/${item.filename}`;
    categories[category].push({
      title: item.title,
      githubUrl: githubUrl
    });
  }
});

// Create output directory
const outputDir = path.join(__dirname, '../github-urls-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Generate CSV files for each category
Object.keys(categories).forEach(category => {
  const items = categories[category];
  
  if (items.length === 0) {
    console.log(`⚠️  No ${category} covers found`);
    return;
  }

  // Create CSV content with proper escaping
  const csvLines = ['Title,GitHubCoverURL'];
  items.forEach(item => {
    // Escape quotes in title
    const escapedTitle = item.title.replace(/"/g, '""');
    // Wrap in quotes if contains comma
    const titleField = item.title.includes(',') ? `"${escapedTitle}"` : escapedTitle;
    csvLines.push(`${titleField},${item.githubUrl}`);
  });

  const csvContent = csvLines.join('\n');
  const outputPath = path.join(outputDir, `${category}-github-urls.csv`);
  
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`✅ Generated ${category}-github-urls.csv (${items.length} covers)`);
});

// Generate summary
const totalCovers = Object.values(categories).reduce((sum, arr) => sum + arr.length, 0);
console.log(`\n📊 Summary:`);
console.log(`   Books: ${categories.books.length} covers`);
console.log(`   Movies: ${categories.movies.length} covers`);
console.log(`   TV: ${categories.tv.length} covers`);
console.log(`   Games: ${categories.games.length} covers`);
console.log(`   Total: ${totalCovers} covers`);
console.log(`\n📁 CSV files saved to: ${outputDir}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Open each CSV file in the github-urls-output folder`);
console.log(`   2. Copy the GitHubCoverURL column`);
console.log(`   3. Paste it as a new column in your Google Sheets`);
console.log(`   4. Match rows by Title to ensure correct alignment`);
