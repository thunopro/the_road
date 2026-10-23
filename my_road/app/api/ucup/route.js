import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || 'nguyenkhacthu';

    const targetUrl = `https://universal-cup.vercel.app/api/ac/public?token=${encodeURIComponent(token)}`;
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      next: { revalidate: 60 } // cache for 1 minute
    });

    if (!res.ok) {
      return NextResponse.json({
        error: `Remote UCUP API responded with status ${res.status}`
      }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      lastSync: data.lastSync,
      totalSolved: data.items ? data.items.length : 0,
      target: 200, // target lock problem count for World Final roadmap
      heat: data.heat || [],
      items: data.items || []
    });
  } catch (err) {
    console.error('UCUP proxy error:', err);
    return NextResponse.json({
      error: err.message
    }, { status: 500 });
  }
}
