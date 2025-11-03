/**
 * Custom hook for managing word pool
 */

import { useState, useEffect } from 'react';
import { createWordPoolService } from '@/services/wordPoolService';

export function useWordPool() {
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWordPool();
  }, []);

  const loadWordPool = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const service = createWordPoolService();
      const words = await service.fetchWords();

      if (!words || words.length === 0) {
        setError('Word pool is empty. Please populate the word_pool table.');
        setWordPool([]);
      } else {
        setWordPool(words);
      }
    } catch (err) {
      console.error('Error loading word pool:', err);
      setError('Failed to load word pool');
      setWordPool([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { wordPool, isLoading, error, reload: loadWordPool };
}
