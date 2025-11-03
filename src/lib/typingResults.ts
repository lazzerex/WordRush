import { createClient } from '@/lib/supabase/client';
import type { TypingResult } from '@/types/database';

interface SaveResultParams {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  duration: number;
  theme: string;
}

export async function saveTypingResult(params: SaveResultParams): Promise<TypingResult | null> {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('User not authenticated, result not saved');
    return null;
  }

  const { data, error } = await supabase
    .from('typing_results')
    .insert([
      {
        user_id: user.id,
        wpm: params.wpm,
        accuracy: params.accuracy,
        correct_chars: params.correctChars,
        incorrect_chars: params.incorrectChars,
        duration: params.duration,
        theme: params.theme,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error saving typing result:', error);
    return null;
  }

  return data;
}

export async function getUserResults(limit: number = 10): Promise<TypingResult[]> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('typing_results')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user results:', error);
    return [];
  }

  return data || [];
}

export async function getUserStats() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  // Get all results for the user (for the activity heatmap)
  const { data, error } = await supabase
    .from('typing_results')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return {
      totalTests: 0,
      averageWpm: 0,
      averageAccuracy: 0,
      highestWpm: 0,
      recentTests: [],
      allResults: [],
    };
  }

  // Calculate statistics
  const totalTests = data.length;
  const averageWpm = Math.round(
    data.reduce((sum, result) => sum + result.wpm, 0) / totalTests
  );
  const averageAccuracy = Math.round(
    data.reduce((sum, result) => sum + result.accuracy, 0) / totalTests
  );
  const highestWpm = Math.max(...data.map((result) => result.wpm));
  const recentTests = data.slice(0, 10);

  return {
    totalTests,
    averageWpm,
    averageAccuracy,
    highestWpm,
    recentTests,
    allResults: data, // Include all results for the activity heatmap
  };
}

export async function deleteResult(resultId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('typing_results')
    .delete()
    .eq('id', resultId);

  if (error) {
    console.error('Error deleting result:', error);
    return false;
  }

  return true;
}
