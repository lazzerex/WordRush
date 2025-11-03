import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' }, 
        { status: 401 }
      );
    }

    const body: SubmitResultRequest = await request.json();
    const { 
      keystrokes,
      wordsTyped,
      expectedWords,
      duration,
      startTime,
      theme 
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
    const toleranceMs = 5000; // Allow some tolerance for latency and clock drift
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

  // 7. Check for suspicious patterns (e.g., too few keystrokes for the WPM)
    const minExpectedKeystrokes = Math.floor(correctChars * 0.5); // At least 50% of correct chars
    if (keystrokes.length < minExpectedKeystrokes) {
      return NextResponse.json(
        { error: 'Insufficient keystroke data for claimed performance' }, 
        { status: 400 }
      );
    }

  // 8. Insert validated result into database
    const { data, error } = await supabase
      .from('typing_results')
      .insert([{
        user_id: user.id,
        wpm: wpm,
        accuracy: accuracy,
        correct_chars: correctChars,
        incorrect_chars: incorrectChars,
        duration: duration,
        theme: theme || 'monkeytype-inspired',
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save result' }, 
        { status: 500 }
      );
    }

  // 9. Return success with calculated stats
    return NextResponse.json({ 
      success: true, 
      data: {
        ...data,
        wpm,
        accuracy
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
