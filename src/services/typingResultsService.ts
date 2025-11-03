/**
 * Typing Results Service Interface
 * Following Interface Segregation Principle
 */

import type { TypingResult, UserStats } from '@/types/database';

export interface SaveResultParams {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  duration: number;
  theme: string;
}

export interface ITypingResultsService {
  saveResult(params: SaveResultParams): Promise<TypingResult | null>;
  getUserResults(limit?: number, offset?: number): Promise<TypingResult[]>;
  getUserResultsPaginated(limit?: number, offset?: number): Promise<{ results: TypingResult[]; total: number }>;
  getUserStats(): Promise<UserStats | null>;
  deleteResult(resultId: string): Promise<boolean>;
}

/**
 * Supabase implementation of Typing Results Service
 */
import { createClient } from '@/lib/supabase/client';

export class SupabaseTypingResultsService implements ITypingResultsService {
  private supabase = createClient();

  async saveResult(params: SaveResultParams): Promise<TypingResult | null> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      console.log('User not authenticated, result not saved');
      return null;
    }

    const { data, error } = await this.supabase
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

  async getUserResults(limit: number = 10, offset: number = 0): Promise<TypingResult[]> {
    const { results } = await this.getUserResultsPaginated(limit, offset);
    return results;
  }

  async getUserResultsPaginated(
    limit: number = 10,
    offset: number = 0
  ): Promise<{ results: TypingResult[]; total: number }> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return { results: [], total: 0 };
    }

    const rangeStart = offset;
    const rangeEnd = Math.max(offset + limit - 1, offset);

    const { data, error, count } = await this.supabase
      .from('typing_results')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeEnd);

    if (error) {
      console.error('Error fetching user results:', error);
      return { results: [], total: 0 };
    }

    return {
      results: data || [],
      total: count ?? (data ? data.length : 0),
    };
  }

  async getUserStats(): Promise<UserStats | null> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await this.supabase
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
      allResults: data,
    };
  }

  async deleteResult(resultId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('typing_results')
      .delete()
      .eq('id', resultId);

    if (error) {
      console.error('Error deleting result:', error);
      return false;
    }

    return true;
  }
}

/**
 * Factory function to get typing results service
 */
export function createTypingResultsService(): ITypingResultsService {
  return new SupabaseTypingResultsService();
}
