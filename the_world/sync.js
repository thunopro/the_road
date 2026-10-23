const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.resolve(__dirname, '../../writing/the_world');
const DEST_DIR = path.resolve(__dirname, 'public/articles');
const DATA_FILE = path.resolve(__dirname, 'public/articles/index.json');
const ALLOWED_EXT_REGEX = /\.txt$/i;

function syncArticles() {
  const start = performance.now();
  console.log(`[FAST-SYNC] Reading from: ${SOURCE_DIR}`);

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
    if (file.startsWith('.') || !ALLOWED_EXT_REGEX.test(file)) continue;

    const filePath = path.join(SOURCE_DIR, file);
    try {
      const lstat = fs.lstatSync(filePath);
      if (!lstat.isFile() || lstat.isSymbolicLink()) continue;

      const rawContent = fs.readFileSync(filePath, 'utf8');
      const destPath = path.join(DEST_DIR, file);
      fs.writeFileSync(destPath, rawContent, 'utf8');

      const cleanName = file.replace(ALLOWED_EXT_REGEX, '').replace(/_/g, ' ').trim() || file;
      const wordCount = rawContent.trim() ? rawContent.trim().split(/\s+/).length : 0;

      articles.push({
        id: file,
        name: file,
        title: cleanName,
        size: lstat.size,
        wordCount,
        lastModified: lstat.mtime.toISOString(),
        isTxt: true
      });
    } catch (e) {}
  }

  articles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

  const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(articles, null, 2), 'utf8');
  fs.renameSync(tempFile, DATA_FILE);

  const duration = (performance.now() - start).toFixed(2);
  console.log(`[FAST-SYNC SUCCESS] Synced ${articles.length} txt article(s) in ${duration}ms.`);
  return articles;
}

if (require.main === module) {
  syncArticles();
}

module.exports = { syncArticles, SOURCE_DIR, DEST_DIR, DATA_FILE };
