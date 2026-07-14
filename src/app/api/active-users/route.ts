import { NextRequest, NextResponse } from 'next/server';
import { getActiveUsersCount, markUserActive } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, generalLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const count = await getActiveUsersCount();

    return NextResponse.json({
      success: true,
      data: {
        activeUsers: count,
      },
    });
  } catch (error) {
    logger.error('Error fetching active users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let identity: string;

    if (user) {
      identity = user.id;
    } else {
      // Guests also count toward "players online" - same guest identity
      // pattern used by chat (sessionStorage UUID from getOrCreateGuestId()).
      const body = await request.json().catch(() => ({}));
      const guestId = body?.guestId;

      if (!guestId || typeof guestId !== 'string' || guestId.length > 100) {
        return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
      }

      // Rate-limit guest pings by IP - authenticated calls are already
      // implicitly bounded by real accounts, guests aren't.
      const identifier = getRateLimitIdentifier(request);
      const rateLimitResult = await checkRateLimit(generalLimiter, identifier, 60);
      if (!rateLimitResult.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }

      identity = `guest:${guestId}`;
    }

    await markUserActive(identity);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error('Error marking user active:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
