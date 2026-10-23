import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_ID_REGEX = /^[a-zA-Z0-9_\-]+\.(txt|md)$/;
const ALLOWED_EXT_REGEX = /\.(txt|md)$/i;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const SOURCE_DIR = path.resolve(process.cwd(), '../../writing/the_world');
    const THE_WORLD_DIR = path.resolve(process.cwd(), '../the_world/public/articles');

    if (id) {
      if (!ALLOWED_ID_REGEX.test(id)) {
        return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
      }

      const safeId = path.basename(id);
      if (safeId !== id || safeId === '.' || safeId === '..') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const checkFile = (dir) => {
        const fullPath = path.resolve(dir, safeId);
        if (fullPath.startsWith(dir + path.sep) && fs.existsSync(fullPath)) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isFile()) return fullPath;
          } catch (e) {}
        }
        return null;
      };

      const targetFile = checkFile(SOURCE_DIR) || checkFile(THE_WORLD_DIR);
      if (!targetFile) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }

      const content = fs.readFileSync(targetFile, 'utf8');
      return NextResponse.json(
        { id: safeId, content },
        {
          headers: {
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
          }
        }
      );
    }

    // Check pre-indexed JSON in the_world/public/articles/index.json first for speed
    const indexedJson = path.join(THE_WORLD_DIR, 'index.json');
    if (fs.existsSync(indexedJson)) {
      try {
        const data = JSON.parse(fs.readFileSync(indexedJson, 'utf8'));
        return NextResponse.json(
          { articles: data },
          {
            headers: {
              'Cache-Control': 'public, max-age=30, stale-while-revalidate=120'
            }
          }
        );
      } catch (e) {}
    }

    let dirToScan = fs.existsSync(SOURCE_DIR) ? SOURCE_DIR : THE_WORLD_DIR;
    if (fs.existsSync(dirToScan)) {
      const files = fs.readdirSync(dirToScan);
      const articles = [];
      for (const file of files) {
        if (file.startsWith('.') || !ALLOWED_EXT_REGEX.test(file)) continue;

        try {
          const filePath = path.join(dirToScan, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            const cleanName = file.replace(ALLOWED_EXT_REGEX, '').replace(/_/g, ' ').trim() || file;
            articles.push({
              id: file,
              name: file,
              title: cleanName,
              size: stat.size,
              wordCount: Math.round(stat.size / 6), // fast estimation
              lastModified: stat.mtime.toISOString(),
              isTxt: file.endsWith('.txt')
            });
          }
        } catch (fileErr) {
          console.warn(`[ARTICLES API] Skipped ${file}:`, fileErr.message);
        }
      }
      articles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      return NextResponse.json({ articles });
    }

    return NextResponse.json({ articles: [] });
  } catch (err) {
    console.error('Articles route error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
