const fs = require('fs');
const path = require('path');

// Target directory containing raw essays
const SOURCE_DIR = path.resolve(__dirname, '../../writing/the_world');
const DEST_DIR = path.resolve(__dirname, 'public/articles');
const DATA_FILE = path.resolve(__dirname, 'public/articles/index.json');

function syncArticles() {
  console.log(`[SYNC] Reading from: ${SOURCE_DIR}`);
  console.log(`[SYNC] Outputting to: ${DEST_DIR}`);

  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
  }

  if (!fs.existsSync(SOURCE_DIR)) {
    console.warn(`[SYNC WARNING] Source directory ${SOURCE_DIR} not found.`);
    return [];
  }

  const files = fs.readdirSync(SOURCE_DIR);
  const articles = [];

  for (const file of files) {
    // Only accept text files or markdown files if needed, primarily txt as user specified
    if (file.endsWith('.txt') || file.endsWith('.md')) {
      const filePath = path.join(SOURCE_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const destPath = path.join(DEST_DIR, file);
        fs.writeFileSync(destPath, rawContent, 'utf8');

        // Derive title
        const cleanName = file.replace(/\.(txt|md)$/, '').replace(/_/g, ' ');
        const wordCount = rawContent.trim() ? rawContent.trim().split(/\s+/).length : 0;

        articles.push({
          id: file,
          name: file,
          title: cleanName,
          size: stat.size,
          wordCount,
          lastModified: stat.mtime.toISOString(),
          isTxt: file.endsWith('.txt')
        });
      }
    }
  }

  // Sort: newest first or alphabetical
  articles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

  fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2), 'utf8');
  console.log(`[SYNC SUCCESS] Synced ${articles.length} article(s).`);
  return articles;
}

if (require.main === module) {
  syncArticles();
}

module.exports = { syncArticles, SOURCE_DIR, DEST_DIR, DATA_FILE };
