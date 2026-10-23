import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_EXT_REGEX = /\.(txt|md)$/i;

export async function POST(request) {
  try {
    const SOURCE_DIR = path.resolve(process.cwd(), '../../writing/the_world');
    const DEST_DIR = path.resolve(process.cwd(), 'public/articles');
    const DATA_FILE = path.resolve(DEST_DIR, 'index.json');

    if (!fs.existsSync(DEST_DIR)) {
      fs.mkdirSync(DEST_DIR, { recursive: true });
    }

    if (!fs.existsSync(SOURCE_DIR)) {
      return NextResponse.json({
        success: false,
        error: `Source directory ${SOURCE_DIR} does not exist.`
      }, { status: 404 });
    }

    const files = fs.readdirSync(SOURCE_DIR);
    const articles = [];

    for (const file of files) {
      if (file.startsWith('.') || !ALLOWED_EXT_REGEX.test(file)) continue;

      const filePath = path.join(SOURCE_DIR, file);
      try {
        const lstat = fs.lstatSync(filePath);
        // Skip symlinks pointing outside and non-regular files
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
          isTxt: file.endsWith('.txt')
        });
      } catch (err) {
        console.warn(`[SYNC] Skipped unreadable file ${file}:`, err.message);
      }
    }

    articles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    // Atomic write to avoid concurrent read corruption
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(articles, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);

    return NextResponse.json({
      success: true,
      message: `Synchronized ${articles.length} article(s) successfully.`,
      count: articles.length,
      syncedAt: new Date().toISOString(),
      articles
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
