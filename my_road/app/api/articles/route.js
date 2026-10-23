import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const SOURCE_DIR = path.resolve(process.cwd(), '../../writing/the_world');
  const THE_WORLD_DIR = path.resolve(process.cwd(), '../the_world/public/articles');

  if (id) {
    const safeId = path.basename(id);
    let targetFile = path.join(SOURCE_DIR, safeId);
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(THE_WORLD_DIR, safeId);
    }

    if (fs.existsSync(targetFile)) {
      const content = fs.readFileSync(targetFile, 'utf8');
      return NextResponse.json({ id: safeId, content });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let dirToScan = fs.existsSync(SOURCE_DIR) ? SOURCE_DIR : THE_WORLD_DIR;
  if (fs.existsSync(dirToScan)) {
    const files = fs.readdirSync(dirToScan);
    const articles = [];
    for (const file of files) {
      if (file.endsWith('.txt') || file.endsWith('.md')) {
        const filePath = path.join(dirToScan, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const rawContent = fs.readFileSync(filePath, 'utf8');
          articles.push({
            id: file,
            name: file,
            title: file.replace(/\.(txt|md)$/, '').replace(/_/g, ' '),
            size: stat.size,
            wordCount: rawContent.trim() ? rawContent.trim().split(/\s+/).length : 0,
            lastModified: stat.mtime.toISOString()
          });
        }
      }
    }
    articles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    return NextResponse.json({ articles });
  }

  return NextResponse.json({ articles: [] });
}
