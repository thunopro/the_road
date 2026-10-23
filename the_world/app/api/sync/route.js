import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_EXT_REGEX = /\.txt$/i;

// In-memory cache of file timestamps to avoid reading unchanged files from disk
const fileTimestampCache = new Map();

export async function POST(request) {
  const startTime = performance.now();
  try {
    const SOURCE_DIR = path.resolve(process.cwd(), '../../writing/the_world');
    const DEST_DIR = path.resolve(process.cwd(), 'public/articles');
    const DATA_FILE = path.resolve(DEST_DIR, 'index.json');

    if (!fs.existsSync(DEST_DIR)) {
      await fs.promises.mkdir(DEST_DIR, { recursive: true });
    }

    if (!fs.existsSync(SOURCE_DIR)) {
      // If deployed on Vercel without local folder, return current public index immediately
      if (fs.existsSync(DATA_FILE)) {
        const raw = await fs.promises.readFile(DATA_FILE, 'utf8');
        const articles = JSON.parse(raw);
        return NextResponse.json({
          success: true,
          message: 'Using bundled articles archive.',
          count: articles.length,
          syncedAt: new Date().toISOString(),
          durationMs: (performance.now() - startTime).toFixed(2),
          articles
        });
      }
      return NextResponse.json({ success: false, error: 'Source directory not found' }, { status: 404 });
    }

    const files = await fs.promises.readdir(SOURCE_DIR);
    const validFiles = files.filter(f => !f.startsWith('.') && ALLOWED_EXT_REGEX.test(f));

    // Parallel async inspection (Promise.all)
    const articles = await Promise.all(
      validFiles.map(async (file) => {
        const filePath = path.join(SOURCE_DIR, file);
        try {
          const lstat = await fs.promises.lstat(filePath);
          if (!lstat.isFile() || lstat.isSymbolicLink()) return null;

          const destPath = path.join(DEST_DIR, file);
          const mtimeMs = lstat.mtimeMs;
          const cachedMtime = fileTimestampCache.get(file);

          let rawContent = '';
          // Only read and rewrite if file was modified or destination is missing
          if (cachedMtime !== mtimeMs || !fs.existsSync(destPath)) {
            rawContent = await fs.promises.readFile(filePath, 'utf8');
            await fs.promises.writeFile(destPath, rawContent, 'utf8');
            fileTimestampCache.set(file, mtimeMs);
          } else {
            rawContent = await fs.promises.readFile(destPath, 'utf8');
          }

          const cleanName = file.replace(ALLOWED_EXT_REGEX, '').replace(/_/g, ' ').trim() || file;
          const wordCount = rawContent.trim() ? rawContent.trim().split(/\s+/).length : 0;

          return {
            id: file,
            name: file,
            title: cleanName,
            size: lstat.size,
            wordCount,
            lastModified: lstat.mtime.toISOString(),
            isTxt: true
          };
        } catch (err) {
          return null;
        }
      })
    );

    const filtered = articles.filter(Boolean);
    filtered.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    // Atomic write
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    await fs.promises.writeFile(tempFile, JSON.stringify(filtered, null, 2), 'utf8');
    await fs.promises.rename(tempFile, DATA_FILE);

    const elapsed = (performance.now() - startTime).toFixed(2);

    return NextResponse.json({
      success: true,
      message: `Synchronized ${filtered.length} txt file(s) in ${elapsed}ms`,
      count: filtered.length,
      syncedAt: new Date().toISOString(),
      durationMs: elapsed,
      articles: filtered
    });
  } catch (error) {
    console.error('Fast sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
