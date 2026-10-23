import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const DEST_DIR = path.resolve(process.cwd(), 'public/articles');
  const DATA_FILE = path.resolve(DEST_DIR, 'index.json');

  if (id) {
    // Sanitize id to prevent directory traversal
    const safeId = path.basename(id);
    const targetPath = path.join(DEST_DIR, safeId);

    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, 'utf8');
      return NextResponse.json({
        id: safeId,
        content: content
      });
    } else {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
  }

  // Return index
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return NextResponse.json({ articles: data });
    } catch (e) {
      return NextResponse.json({ articles: [] });
    }
  }

  return NextResponse.json({ articles: [] });
}
