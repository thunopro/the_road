import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VALID_TOKEN_REGEX = /^[a-zA-Z0-9_\-]{1,64}$/;
const TARGET_GOAL = 1000; // Target lock 1000 problems for World Finals roadmap

// In-memory cache to make repeated requests sub-millisecond (0ms)
let cachedTelemetry = null;
let lastFetchTime = 0;
const CACHE_TTL = 30000; // 30 seconds fresh cache

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get('token') || 'nguyenkhacthu';

    if (!VALID_TOKEN_REGEX.test(rawToken)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    const now = Date.now();
    if (cachedTelemetry && (now - lastFetchTime < CACHE_TTL)) {
      return NextResponse.json(cachedTelemetry, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
          'X-Cache': 'HIT-MEMORY'
        }
      });
    }

    const targetUrl = `https://universal-cup.vercel.app/api/ac/public?token=${encodeURIComponent(rawToken)}`;
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (TheRoad-Client/1.0)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 30 }
    });

    if (!res.ok) {
      if (cachedTelemetry) {
        return NextResponse.json(cachedTelemetry, {
          headers: { 'X-Cache': 'STALE-FALLBACK' }
        });
      }
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
    const result = {
      success: true,
      lastSync: data?.lastSync || null,
      totalSolved: Array.isArray(data?.items) ? data.items.length : 0,
      target: TARGET_GOAL,
      heat: Array.isArray(data?.heat) ? data.heat : [],
      items: Array.isArray(data?.items) ? data.items : []
    };

    cachedTelemetry = result;
    lastFetchTime = now;

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        'X-Cache': 'MISS'
      }
    });
  } catch (err) {
    if (cachedTelemetry) {
      return NextResponse.json(cachedTelemetry, {
        headers: { 'X-Cache': 'STALE-FALLBACK-ERR' }
      });
    }
    console.error('UCUP proxy error:', err.message);
    return NextResponse.json({ error: 'External service request failed or timed out' }, { status: 500 });
  }
}
