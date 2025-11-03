/**
 * Formatting utilities
 */

/**
 * Format a date string to localized format
 */
export function formatDate(
  dateString: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  return date.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Get WPM rating label
 */
export function getWpmRating(wpm: number): string {
  if (wpm >= 100) return 'Expert';
  if (wpm >= 80) return 'Advanced';
  if (wpm >= 60) return 'Intermediate';
  if (wpm >= 40) return 'Beginner';
  return 'Novice';
}

/**
 * Get accuracy rating label
 */
export function getAccuracyRating(accuracy: number): string {
  if (accuracy >= 95) return 'Excellent';
  if (accuracy >= 90) return 'Great';
  if (accuracy >= 80) return 'Good';
  if (accuracy >= 70) return 'Fair';
  return 'Needs Work';
}

/**
 * Get color class for WPM value
 */
export function getWpmColorClass(wpm: number): string {
  if (wpm >= 80) return 'text-yellow-400';
  if (wpm >= 60) return 'text-green-400';
  if (wpm >= 40) return 'text-blue-400';
  return 'text-zinc-400';
}

/**
 * Get color class for accuracy value
 */
export function getAccuracyColorClass(accuracy: number): string {
  if (accuracy >= 95) return 'text-green-400';
  if (accuracy >= 85) return 'text-blue-400';
  if (accuracy >= 75) return 'text-orange-400';
  return 'text-red-400';
}
