import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Only allow .txt files per user requirement
const ALLOWED_ID_REGEX = /^[a-zA-Z0-9_\-]+\.txt$/i;

function getSearchDirectories() {
  return [
    path.resolve(process.cwd(), 'public/articles'),
    path.resolve(process.cwd(), '../../writing/the_world'),
    path.resolve(process.cwd(), '../the_world/public/articles'),
  ];
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const searchDirs = getSearchDirectories();

    if (id) {
      if (!ALLOWED_ID_REGEX.test(id)) {
        return NextResponse.json({ error: 'Only .txt files are allowed' }, { status: 400 });
      }

      const safeId = path.basename(id);
      if (safeId !== id || safeId === '.' || safeId === '..') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
          const fullPath = path.resolve(dir, safeId);
          if (fullPath.startsWith(dir + path.sep) && fs.existsSync(fullPath)) {
            try {
              const stat = fs.statSync(fullPath);
              if (stat.isFile()) {
                const content = fs.readFileSync(fullPath, 'utf8');
                return NextResponse.json(
                  { id: safeId, content },
                  {
                    headers: {
                      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
                    }
                  }
                );
              }
            } catch (e) {}
          }
        }
      }

      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // List articles: Only .txt files
    // Check index.json in public/articles if present
    const publicIndexJson = path.resolve(process.cwd(), 'public/articles/index.json');
    if (fs.existsSync(publicIndexJson)) {
      try {
        const raw = JSON.parse(fs.readFileSync(publicIndexJson, 'utf8'));
        const txtOnly = (Array.isArray(raw) ? raw : []).filter(a => a?.name?.toLowerCase().endsWith('.txt'));
        if (txtOnly.length > 0) {
          return NextResponse.json(
            { articles: txtOnly },
            { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } }
          );
        }
      } catch (e) {}
    }

    // Scan directories for .txt files
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const articles = [];
        for (const file of files) {
          if (file.startsWith('.') || !file.toLowerCase().endsWith('.txt')) continue;
          try {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              const rawContent = fs.readFileSync(filePath, 'utf8');
              const cleanName = file.replace(/\.txt$/i, '').replace(/_/g, ' ').trim() || file;
              const wordCount = rawContent.trim() ? rawContent.trim().split(/\s+/).length : 0;
              articles.push({
                id: file,
                name: file,
                title: cleanName,
                size: stat.size,
                wordCount,
                lastModified: stat.mtime.toISOString(),
                isTxt: true
              });
            }
          } catch (fileErr) {}
        }

        if (articles.length > 0) {
          articles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
          return NextResponse.json({ articles });
        }
      }
    }

    return NextResponse.json({ articles: [] });
  } catch (err) {
    console.error('Articles route error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
