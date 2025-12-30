import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { addToLeaderboardCache } from '@/services/leaderboardCacheService';
import { checkRateLimit, getRateLimitIdentifier, testSubmissionLimiter } from '@/lib/ratelimit';
import { updateUserStreak } from '@/lib/session';
import { redis } from '@/lib/redis';

interface KeystrokeEvent {
  timestamp: number;
  key: string;
  wordIndex: number;
  isCorrect: boolean;
}

interface SubmitResultRequest {
  keystrokes: KeystrokeEvent[];
  wordsTyped: string[];
  expectedWords: string[];
  duration: number;
  startTime: number;
  theme: string;
  language?: string;
}


function detectTypingBursts(gaps: number[], threshold: number = 1.5): boolean {
  const windowSize = 10; // Check 10-keystroke windows
  for (let i = 0; i <= gaps.length - windowSize; i++) {
    const window = gaps.slice(i, i + windowSize);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const windowVariance = Math.sqrt(
      window.reduce((sum, gap) => sum + Math.pow(gap - mean, 2), 0) / window.length
    );
  
    if (windowVariance < threshold) {
      return true; 
    }
  }
  return false;
}


function calculateTimingVariance(keystrokes: { timestamp: number }[]) {
  if (keystrokes.length < 2) return 0;
  const intervals = [];
  for (let i = 1; i < keystrokes.length; i++) {
    intervals.push(keystrokes[i].timestamp - keystrokes[i - 1].timestamp);
  }
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
  return Math.sqrt(variance);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      testId,
      keystrokes,
      wordsTyped,
      expectedWords,
      duration,
      startTime,
      theme,
      language = 'en',
    } = body;

    //Idempotency/replay protection with atomic operation
    if (!testId || typeof testId !== 'string') {
      console.error('[ReplayProtection] Missing or invalid test ID');
      return NextResponse.json({ error: 'Missing test ID' }, { status: 400 });
    }

    // Validate testId format (UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(testId)) {
      console.error('[ReplayProtection] Invalid test ID format:', testId);
      return NextResponse.json({ error: 'Invalid test ID format' }, { status: 400 });
    }

    // Use Redis SET with NX for atomic check-and-set (prevents race conditions)
    const testKey = `test:${user.id}:${testId}`;
    console.log('[ReplayProtection] Checking test ID:', testId);
    
    // Use SET with options object, the classic ioredis/upstash style i guess
    const wasSet = await redis.set(testKey, '1', { ex: 86400, nx: true });
    
    if (!wasSet) {
      console.warn('[ReplayProtection] Duplicate submission detected for test:', testId);
      console.warn('[ReplayProtection] User:', user.id);
      return NextResponse.json(
        { error: 'Test result already submitted' }, 
        { status: 400 }
      );
    }

    console.log('[ReplayProtection] Test ID accepted:', testId);

    // Check rate limit (20 submissions per minute per user)
    const identifier = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = await checkRateLimit(testSubmissionLimiter, identifier, 20);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many test submissions. Please wait a moment before trying again.',
          limit: rateLimitResult.limit,
          reset: rateLimitResult.reset,
        },
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

    // Validate request data
    if (!keystrokes || !Array.isArray(keystrokes)) {
      return NextResponse.json(
        { error: 'Invalid keystroke data' }, 
        { status: 400 }
      );
    }

    if (!wordsTyped || !expectedWords || !duration || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Verify keystroke timestamps are sequential and within test duration
    
    if (keystrokes.length === 0) {
      console.log('[Validation] No keystrokes recorded - skipping timing validation');
    }
    
    const sortedKeystrokes = [...keystrokes].sort((a, b) => a.timestamp - b.timestamp);
    const firstKeystroke = sortedKeystrokes[0]?.timestamp || startTime;
    const lastKeystroke = sortedKeystrokes[sortedKeystrokes.length - 1]?.timestamp || startTime;

    const expectedDurationMs = duration * 1000;
    const BASE_TOLERANCE = 20000; // 20 seconds base tolerance
    const SCALE_TOLERANCE = 0.20; // 20% of test duration
    const toleranceMs = Math.max(
      BASE_TOLERANCE,
      Math.round(expectedDurationMs * SCALE_TOLERANCE)
    );
    const actualDurationFromKeystrokes = lastKeystroke - startTime;

    // Log timing info for debugging
    console.log('[Timing] Start time:', new Date(startTime).toISOString());
    console.log('[Timing] First keystroke:', new Date(firstKeystroke).toISOString());
    console.log('[Timing] Last keystroke:', new Date(lastKeystroke).toISOString());
    console.log('[Timing] Expected duration:', expectedDurationMs, 'ms');
    console.log('[Timing] Actual duration:', actualDurationFromKeystrokes, 'ms');
    console.log('[Timing] Tolerance:', toleranceMs, 'ms');

    if (actualDurationFromKeystrokes < -2000) {
      console.error('[Timing] Keystrokes precede start time');
      return NextResponse.json(
        { error: 'Invalid timing - keystrokes precede recorded start time' },
        { status: 400 }
      );
    }
    
    // Allow keystrokes to start before recorded start (5s grace period for clock sync issues)
    if (keystrokes.length > 0 && firstKeystroke < startTime - 5000) {
      console.error('[Timing] First keystroke too early:', {
        firstKeystroke: new Date(firstKeystroke).toISOString(),
        startTime: new Date(startTime).toISOString(),
        difference: startTime - firstKeystroke
      });
      return NextResponse.json(
        { error: 'Invalid keystroke timestamps - test started too early' }, 
        { status: 400 }
      );
    }
    
    if (keystrokes.length > 0 && lastKeystroke > startTime + expectedDurationMs + toleranceMs) {
      console.error('[Timing] Last keystroke too late:', {
        lastKeystroke: new Date(lastKeystroke).toISOString(),
        expectedEnd: new Date(startTime + expectedDurationMs).toISOString(),
        allowedEnd: new Date(startTime + expectedDurationMs + toleranceMs).toISOString(),
        exceeded: lastKeystroke - (startTime + expectedDurationMs + toleranceMs)
      });
      return NextResponse.json(
        { error: 'Invalid keystroke timestamps - test took too long' }, 
        { status: 400 }
      );
    }

    // keystroke gap validation (anti-timing attack)
    const keystrokeGaps = [];
    let suspiciouslyLongPauses = 0;
    
    if (keystrokes.length >= 10) {
      for (let i = 1; i < sortedKeystrokes.length; i++) {
        const gap = sortedKeystrokes[i].timestamp - sortedKeystrokes[i - 1].timestamp;
        keystrokeGaps.push(gap);
        
        if (gap > 10000) {
          suspiciouslyLongPauses++;
        }
        
        if (gap > 30000) { 
          console.error('[Keystroke] Extremely long pause detected:', gap, 'ms');
          return NextResponse.json(
            { error: 'Test session expired or invalid - please try again' },
            { status: 400 }
          );
        }
      }

      if (suspiciouslyLongPauses > 3) {
        console.error('[Keystroke] Too many long pauses:', suspiciouslyLongPauses);
        return NextResponse.json(
          { error: 'Test contains too many long pauses - please maintain consistent typing' },
          { status: 400 }
        );
      }

      if (keystrokeGaps.length > 0) {
        const avgGap = keystrokeGaps.reduce((a, b) => a + b, 0) / keystrokeGaps.length;
        
        if (avgGap < 3 || avgGap > 5000) {
          console.error('[Keystroke] Invalid average gap:', avgGap, 'ms');
          return NextResponse.json(
            { error: 'Invalid typing pattern detected - please type naturally' },
            { status: 400 }
          );
        }

        // too many false positive (will check later)
        // const timingVariance = calculateTimingVariance(sortedKeystrokes);
        // console.log('[Debug] Timing variance:', timingVariance, 'ms');

        const testDurationMs = lastKeystroke - firstKeystroke;
        const keystrokesPerSecond = testDurationMs > 0 ? keystrokes.length / (testDurationMs / 1000) : 0;
        
  
        if (keystrokesPerSecond > 0 && (keystrokesPerSecond < 0.1 || keystrokesPerSecond > 100)) {
          console.error('[Keystroke] Invalid keystroke rate:', keystrokesPerSecond, '/sec');
          return NextResponse.json(
            { error: 'Invalid typing speed detected' },
            { status: 400 }
          );
        }

        
        // uncomment below function if need to check for burst detection
        // const burstThreshold = 3; 
        // if (detectTypingBursts(keystrokeGaps, burstThreshold)) {
        //   console.error('[Keystroke] Robotic burst pattern detected');
        //   return NextResponse.json(
        //     { error: 'Automated typing pattern detected' },
        //     { status: 400 }
        //   );
        // }
      }
    } else {
      console.log('[Validation] Too few keystrokes to validate patterns - skipping');
    }

    //just keep some logs for this one
    if (keystrokes.length > 0 && actualDurationFromKeystrokes > expectedDurationMs + toleranceMs + 5000) {
      console.warn(
        `Timing mismatch: keystroke duration ${actualDurationFromKeystrokes}ms exceeds expected ${expectedDurationMs}ms by a lot`
      );
      
    }

    // Server-side recalculation of stats
    let correctChars = 0;
    let incorrectChars = 0;
    let totalWords = 0;

    for (let i = 0; i < Math.min(wordsTyped.length, expectedWords.length); i++) {
      const typed = wordsTyped[i] || '';
      const expected = expectedWords[i] || '';
      totalWords++;

      if (typed === expected) {
        correctChars += expected.length + 1;
      } else {
        const minLength = Math.min(typed.length, expected.length);
        let matchingChars = 0;
        
        for (let j = 0; j < minLength; j++) {
          if (typed[j] === expected[j]) {
            matchingChars++;
          }
        }
        
        correctChars += matchingChars;
        incorrectChars += Math.abs(typed.length - expected.length) + (minLength - matchingChars) + 1;
      }
    }

    // Calculate WPM and accuracy
    const timeInMinutes = duration / 60;
    const wpm = timeInMinutes > 0 ? Math.round((correctChars / 5) / timeInMinutes) : 0;
    const totalChars = correctChars + incorrectChars;
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

    //Validate results are humanly possible
    if (wpm > 300) {
      return NextResponse.json(
        { error: 'WPM exceeds human capability (max 300 WPM)' }, 
        { status: 400 }
      );
    }

    if (wpm < 0 || accuracy < 0 || accuracy > 100) {
      return NextResponse.json(
        { error: 'Invalid calculated statistics' }, 
        { status: 400 }
      );
    }

    // keystroke anti-cheat validation 
    const expectedKeystrokes = correctChars + incorrectChars;
    const keystrokeRatio = keystrokes.length > 0 ? keystrokes.length / (expectedKeystrokes || 1) : 1;
    if (keystrokes.length > 0 && (keystrokeRatio < 0.3 || keystrokeRatio > 10.0)) {
      return NextResponse.json(
        { error: 'Invalid keystroke-to-character ratio' },
        { status: 400 }
      );
    }

    const backspaceCount = keystrokes.filter(k => k.key === 'Backspace').length;
    const backspaceRatio = keystrokes.length > 0 ? backspaceCount / keystrokes.length : 0;
    if (keystrokes.length >= 20 && backspaceRatio > 0.8) {
      return NextResponse.json(
        { error: 'Suspicious typing pattern' },
        { status: 400 }
      );
    }

    //Insert validated result into database
    const { data, error } = await adminClient.rpc('insert_validated_typing_result', {
      p_user_id: user.id,
      p_wpm: wpm,
      p_accuracy: accuracy,
      p_correct_chars: correctChars,
      p_incorrect_chars: incorrectChars,
      p_duration: duration,
      p_theme: theme || 'monkeytype-inspired',
      p_language: language,
    }).single() as { 
      data: { 
        id: string; 
        user_id: string;
        wpm: number;
        accuracy: number;
        correct_chars: number;
        incorrect_chars: number;
        duration: number;
        theme: string;
        created_at: string;
        language: string;
      } | null; 
      error: any;
    };

    if (error) {
      console.error('Database error inserting result:', error);
      return NextResponse.json(
        { error: 'Failed to save result', details: error?.message ?? 'Unknown insert error' }, 
        { status: 500 }
      );
    }

    if (!data) {
      console.error('No data returned from insert_validated_typing_result');
      return NextResponse.json(
        { error: 'Failed to save result - no data returned' }, 
        { status: 500 }
      );
    }

    console.log('[Success] Test result saved:', {
      testId,
      user_id: user.id,
      wpm,
      accuracy,
      duration
    });

    //Award WRCoins proportionally to performance and duration
    const baseMultiplier = duration > 0 ? duration / 7 : 0; // Scale roughly with legacy rewards
    const coinsEarned = baseMultiplier > 0 ? Math.max(0, Math.round(wpm * baseMultiplier)) : 0;

    let totalCoins: number | null = null;

    console.log(`Calculated coins to award: ${coinsEarned} (WPM: ${wpm}, Duration: ${duration}s)`);

    if (coinsEarned > 0) {
      // Try using RPC function first
      const { error: coinsError } = await adminClient.rpc('add_coins', {
        user_uuid: user.id,
        amount: coinsEarned
      });

      if (coinsError) {
        console.error('Failed to award coins via RPC:', coinsError);
        console.log('Attempting direct update instead...');
        
        // Fallback: Get current coins, then update
        const { data: profileData, error: fetchError } = await adminClient
          .from('profiles')
          .select('coins')
          .eq('id', user.id)
          .single();
        
        if (fetchError) {
          console.error('Failed to fetch profile for coin update:', fetchError);
        } else {
          const currentCoins = profileData?.coins || 0;
          const newCoins = currentCoins + coinsEarned;
          
          const { error: updateError } = await adminClient
            .from('profiles')
            .update({ coins: newCoins })
            .eq('id', user.id);
          
          if (updateError) {
            console.error('Failed to award coins via direct update:', updateError);
          } else {
            console.log(`Successfully awarded ${coinsEarned} coins to user ${user.id} (${currentCoins} -> ${newCoins})`);
            totalCoins = newCoins;
          }
        }
      } else {
        console.log(`Successfully awarded ${coinsEarned} coins via RPC to user ${user.id}`);
        const { data: profileData, error: profileError } = await adminClient
          .from('profiles')
          .select('coins')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Failed to fetch updated coin balance:', profileError);
        } else {
          totalCoins = profileData?.coins ?? null;
          console.log(`User ${user.id} now has ${totalCoins} total coins`);
        }
      }
    } else {
      console.log('No coins to award (coinsEarned = 0)');
    }

    if (totalCoins === null) {
      const { data: profileData, error: profileError } = await adminClient
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Failed to fetch coin balance post-result:', profileError);
      } else {
        totalCoins = profileData?.coins ?? null;
      }
    }

    //Update Redis leaderboard cache
    try {
      // Fetch username for cache
      const { data: profileData } = await adminClient
        .from('profiles')
        .select('username, email')
        .eq('id', user.id)
        .single();

      await addToLeaderboardCache({
        id: data.id,
        user_id: user.id,
        username: profileData?.username || `User ${user.id.slice(0, 8)}`,
        email: profileData?.email || '',
        wpm,
        accuracy,
        created_at: data.created_at || new Date().toISOString(),
        duration,
        language,
      });
    } catch (cacheError) {
      console.error('Error updating leaderboard cache:', cacheError);
    }

  
    let streak = null;
    try {
      streak = await updateUserStreak(user.id);
    } catch (streakError) {
      console.error('Error updating user streak:', streakError);
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...data,
        testId, 
        wpm,
        accuracy,
        coinsEarned,
        totalCoins,
        streak: streak ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
        } : undefined,
      }
    });

  } catch (error) {
    console.error('Error in submit-result API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}