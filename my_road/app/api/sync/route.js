import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_EXT_REGEX = /\.(txt|md)$/i;

export async function POST(request) {
  try {
    const SOURCE_DIR = path.resolve(process.cwd(), '../../writing/the_world');
    const THE_WORLD_DIR = path.resolve(process.cwd(), '../the_world/public/articles');
    const DATA_FILE = path.resolve(THE_WORLD_DIR, 'index.json');

    if (!fs.existsSync(SOURCE_DIR)) {
      return NextResponse.json({
        success: false,
        error: `Source directory ${SOURCE_DIR} not found.`
      }, { status: 404 });
    }

    if (!fs.existsSync(THE_WORLD_DIR)) {
      fs.mkdirSync(THE_WORLD_DIR, { recursive: true });
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
        const destPath = path.join(THE_WORLD_DIR, file);
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
        console.warn(`[MY_ROAD SYNC] Skipped ${file}:`, err.message);
      }
    }

    articles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(articles, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);

    return NextResponse.json({
      success: true,
      message: `Synchronized ${articles.length} article(s).`,
      count: articles.length,
      syncedAt: new Date().toISOString(),
      articles
    });
  } catch (err) {
    console.error('MyRoad sync error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
