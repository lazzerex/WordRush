// Detects unnatural "bursts" of perfectly timed keystrokes
function detectTypingBursts(gaps: number[]): boolean {
  const windowSize = 10; // Check 10-keystroke windows
  for (let i = 0; i <= gaps.length - windowSize; i++) {
    const window = gaps.slice(i, i + windowSize);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const windowVariance = Math.sqrt(
      window.reduce((sum, gap) => sum + Math.pow(gap - mean, 2), 0) / window.length
    );
    // If any window has variance < 5ms, it's suspiciously consistent
    if (windowVariance < 5) {
      return true; // Burst detected
    }
  }
  return false;
}
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { addToLeaderboardCache } from '@/services/leaderboardCacheService';
import { checkRateLimit, getRateLimitIdentifier, testSubmissionLimiter } from '@/lib/ratelimit';
import { updateUserStreak } from '@/lib/session';

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

// Helper: Calculate timing variance for keystrokes
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
    
    // 1. Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' }, 
        { status: 401 }
      );
    }

    // 2. Check rate limit (20 submissions per minute per user)
    const identifier = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = await checkRateLimit(testSubmissionLimiter, identifier);
    
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

    const body: SubmitResultRequest = await request.json();
    const { 
      keystrokes,
      wordsTyped,
      expectedWords,
      duration,
      startTime,
      theme,
      language = 'en',
    } = body;

    // 2. Validate request data
    if (!keystrokes || !Array.isArray(keystrokes) || keystrokes.length === 0) {
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

    // 3. Verify keystroke timestamps are sequential and within test duration
    const sortedKeystrokes = [...keystrokes].sort((a, b) => a.timestamp - b.timestamp);
    const firstKeystroke = sortedKeystrokes[0]?.timestamp || startTime;
    const lastKeystroke = sortedKeystrokes[sortedKeystrokes.length - 1]?.timestamp || startTime;

  const expectedDurationMs = duration * 1000;
  // Stricter tolerance: 2s base + 3% of duration, capped at 5s
  const BASE_TOLERANCE = 2000; // 2 seconds
  const SCALE_TOLERANCE = 0.03; // 3%
  const toleranceMs = Math.min(
    BASE_TOLERANCE + Math.round(expectedDurationMs * SCALE_TOLERANCE),
    5000
  );
  const actualDurationFromKeystrokes = lastKeystroke - startTime;

    if (actualDurationFromKeystrokes < -2000) {
      return NextResponse.json(
        { error: 'Invalid timing - keystrokes precede recorded start time' },
        { status: 400 }
      );
    }
    

    if (firstKeystroke < startTime - 1000 || lastKeystroke > startTime + expectedDurationMs + toleranceMs) {
      return NextResponse.json(
        { error: 'Invalid keystroke timestamps' }, 
        { status: 400 }
      );
    }

    // --- Keystroke gap validation (anti-timing attack) ---
    const keystrokeGaps = [];
    for (let i = 1; i < sortedKeystrokes.length; i++) {
      const gap = sortedKeystrokes[i].timestamp - sortedKeystrokes[i - 1].timestamp;
      keystrokeGaps.push(gap);
      // Detect suspiciously large gaps (pause for AI generation)
      if (gap > 3000) { // 3 seconds without keystroke
        return NextResponse.json(
          { error: 'Suspicious keystroke pattern detected' },
          { status: 400 }
        );
      }
    }
    if (keystrokeGaps.length > 0) {
      const avgGap = keystrokeGaps.reduce((a, b) => a + b, 0) / keystrokeGaps.length;
      if (avgGap < 20 || avgGap > 2000) {
        return NextResponse.json(
          { error: 'Invalid keystroke timing pattern' },
          { status: 400 }
        );
      }

      // --- timing variance check (lenient, only catch robotic) ---
      const timingVariance = calculateTimingVariance(sortedKeystrokes);
      // only flag if variance is really low (< 5ms = robotic)
      if (timingVariance < 5) {
        return NextResponse.json(
          { error: 'Unnatural typing detected' },
          { status: 400 }
        );
      }

      // --- Keystroke rate distribution check (lenient for fast typists) ---
      const testDurationMs = lastKeystroke - firstKeystroke;
      const keystrokesPerSecond = keystrokes.length / (testDurationMs / 1000);
      // Allow up to 30 keystrokes/second (360 WPM) for bursts, min 1/sec
      if (keystrokesPerSecond < 1 || keystrokesPerSecond > 30) {
        return NextResponse.json(
          { error: 'Invalid keystroke rate distribution' },
          { status: 400 }
        );
      }

      // --- Burst detection (optional, advanced) ---
      if (detectTypingBursts(keystrokeGaps)) {
        return NextResponse.json(
          { error: 'Automated typing pattern detected' },
          { status: 400 }
        );
      }
    }

    if (actualDurationFromKeystrokes > expectedDurationMs + toleranceMs) {
      console.warn(
        `Timing mismatch: keystroke duration ${actualDurationFromKeystrokes}ms exceeds expected ${expectedDurationMs}ms`
      );
      return NextResponse.json(
        { error: 'Invalid timing - test duration mismatch' },
        { status: 400 }
      );
    }

  // 4. Server-side recalculation of stats
    let correctChars = 0;
    let incorrectChars = 0;
    let totalWords = 0;

    for (let i = 0; i < Math.min(wordsTyped.length, expectedWords.length); i++) {
      const typed = wordsTyped[i] || '';
      const expected = expectedWords[i] || '';
      totalWords++;

      if (typed === expected) {
        // Correct word: count all chars + space
        correctChars += expected.length + 1;
      } else {
        // Incorrect word: count matching chars as correct, rest as incorrect
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

  // 5. Calculate WPM and accuracy
    const timeInMinutes = duration / 60;
    const wpm = timeInMinutes > 0 ? Math.round((correctChars / 5) / timeInMinutes) : 0;
    const totalChars = correctChars + incorrectChars;
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

  // 6. Validate results are humanly possible
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


  // 7. Enhanced keystroke anti-cheat validation
    const expectedKeystrokes = correctChars + incorrectChars;
    const keystrokeRatio = keystrokes.length / (expectedKeystrokes || 1);
    if (keystrokeRatio < 0.8 || keystrokeRatio > 3.0) {
      return NextResponse.json(
        { error: 'Invalid keystroke-to-character ratio' },
        { status: 400 }
      );
    }

    // Backspace pattern check
    const backspaceCount = keystrokes.filter(k => k.key === 'Backspace').length;
    const backspaceRatio = keystrokes.length > 0 ? backspaceCount / keystrokes.length : 0;
    if (backspaceRatio > 0.5) {
      return NextResponse.json(
        { error: 'Suspicious typing pattern' },
        { status: 400 }
      );
    }


  // 8. Insert validated result into database
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

    console.log('Test result saved successfully:', {
      user_id: user.id,
      wpm,
      accuracy,
      duration
    });

    // 9. Award WRCoins proportionally to performance and duration
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

  // 10. Update Redis leaderboard cache
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
      // Don't fail the request if cache update fails
    }

  // 11. Update user streak
    let streak = null;
    try {
      streak = await updateUserStreak(user.id);
    } catch (streakError) {
      console.error('Error updating user streak:', streakError);
      // Don't fail the request if streak update fails
    }

  // 12. Return success with calculated stats and coins earned
    return NextResponse.json({ 
      success: true, 
      data: {
        ...data,
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
