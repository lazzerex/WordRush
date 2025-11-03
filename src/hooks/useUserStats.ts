/**
 * Custom hook for user statistics
 */

import { useState, useEffect, useCallback } from 'react';
import { createTypingResultsService } from '@/services/typingResultsService';
import type { UserStats } from '@/types/database';

export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const service = createTypingResultsService();
      const userStats = await service.getUserStats();
      setStats(userStats);
    } catch (err) {
      console.error('Error loading user stats:', err);
      setError('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, isLoading, error, reload: loadStats };
}
