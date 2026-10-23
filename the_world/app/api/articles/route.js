import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_ID_REGEX = /^[a-zA-Z0-9_\-]+\.(txt|md)$/;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const DEST_DIR = path.resolve(process.cwd(), 'public/articles');
    const DATA_FILE = path.resolve(DEST_DIR, 'index.json');

    if (id) {
      if (!ALLOWED_ID_REGEX.test(id)) {
        return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
      }

      const safeId = path.basename(id);
      if (safeId !== id || safeId === '.' || safeId === '..') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const targetPath = path.resolve(DEST_DIR, safeId);
      if (!targetPath.startsWith(DEST_DIR + path.sep)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      if (!fs.existsSync(targetPath)) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }

      const stat = fs.statSync(targetPath);
      if (!stat.isFile()) {
        return NextResponse.json({ error: 'Target is not a file' }, { status: 400 });
      }

      const content = fs.readFileSync(targetPath, 'utf8');
      return NextResponse.json(
        { id: safeId, content },
        {
          headers: {
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
          }
        }
      );
    }

    if (fs.existsSync(DATA_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        return NextResponse.json(
          { articles: data },
          {
            headers: {
              'Cache-Control': 'public, max-age=30, stale-while-revalidate=120'
            }
          }
        );
      } catch (e) {
        return NextResponse.json({ articles: [] });
      }
    }

    return NextResponse.json({ articles: [] });
  } catch (err) {
    console.error('Articles route error:', err);
    return NextResponse.json({ error: 'Failed to retrieve article' }, { status: 500 });
  }
}
