import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VALID_TOKEN_REGEX = /^[a-zA-Z0-9_\-]{1,64}$/;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get('token') || 'nguyenkhacthu';

    if (!VALID_TOKEN_REGEX.test(rawToken)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    const targetUrl = `https://universal-cup.vercel.app/api/ac/public?token=${encodeURIComponent(rawToken)}`;
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (TheRoad-Client/1.0)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 60 }
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Remote UCUP API responded with status ${res.status}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Invalid response from upstream API' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(
      {
        success: true,
        lastSync: data?.lastSync || null,
        totalSolved: Array.isArray(data?.items) ? data.items.length : 0,
        target: 200,
        heat: Array.isArray(data?.heat) ? data.heat : [],
        items: Array.isArray(data?.items) ? data.items : []
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      }
    );
  } catch (err) {
    console.error('UCUP proxy error:', err.message);
    return NextResponse.json({ error: 'External service request failed or timed out' }, { status: 500 });
  }
}
