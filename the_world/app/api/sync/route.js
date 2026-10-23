import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

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
      if (file.endsWith('.txt') || file.endsWith('.md')) {
        const filePath = path.join(SOURCE_DIR, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const rawContent = fs.readFileSync(filePath, 'utf8');
          const destPath = path.join(DEST_DIR, file);
          fs.writeFileSync(destPath, rawContent, 'utf8');

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

    articles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2), 'utf8');

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

export async function GET(request) {
  return POST(request);
}
