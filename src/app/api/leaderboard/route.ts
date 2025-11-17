import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboardFromCache, refreshLeaderboardCache } from '@/services/leaderboardCacheService';
import { getLeaderboardPaginated } from '@/lib/leaderboard';
import { checkRateLimit, getRateLimitIdentifier, leaderboardLimiter } from '@/lib/ratelimit';

export async function GET(request: NextRequest) {
  try {
    // Check rate limit (30 requests per minute per IP)
    const identifier = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(leaderboardLimiter, identifier);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit || 0),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
            'X-RateLimit-Reset': String(rateLimitResult.reset || 0),
          }
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const duration = parseInt(searchParams.get('duration') || '30');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // Validate inputs
    if (![15, 30, 60, 120].includes(duration)) {
      return NextResponse.json(
        { error: 'Invalid duration. Must be 15, 30, 60, or 120' },
        { status: 400 }
      );
    }

    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Try to get from cache first
    let result = await getLeaderboardFromCache(duration, page, pageSize);
    let source = 'cache';

    // If cache miss or empty, fall back to database
    if (!result || result.entries.length === 0) {
      source = 'database';
      const offset = (page - 1) * pageSize;
      result = await getLeaderboardPaginated(duration, pageSize, offset);

      // Refresh cache in background (don't await) - only if we have entries
      if (result.entries.length > 0) {
        refreshLeaderboardCache(duration).catch((error) => {
          console.error('Error refreshing cache:', error);
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        entries: result.entries,
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
        source, // For debugging
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
