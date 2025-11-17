import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Helper to check if Redis is properly configured
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

// Leaderboard key generators
export const LEADERBOARD_KEYS = {
  // Sorted set for each duration (stores user_id as member, score as composite of wpm/accuracy)
  leaderboard: (duration: number) => `leaderboard:${duration}`,
  
  // Hash to store full entry details
  entry: (entryId: string) => `entry:${entryId}`,
  
  // Channel for real-time updates
  updates: (duration: number) => `leaderboard-updates:${duration}`,
  
  // Cache for user rank
  userRank: (userId: string, duration: number) => `rank:${userId}:${duration}`,
};

// Calculate composite score for leaderboard sorting
// Formula: wpm * 1000000 + accuracy * 1000 + timestamp_inverse
// This ensures primary sort by WPM, secondary by accuracy, tertiary by time (earlier is better)
export function calculateLeaderboardScore(
  wpm: number,
  accuracy: number,
  createdAt: string
): number {
  const timestamp = new Date(createdAt).getTime();
  // Invert timestamp so earlier times have higher scores (max timestamp - current)
  const maxTimestamp = 8640000000000000; // Max JS timestamp
  const invertedTime = maxTimestamp - timestamp;
  
  // Composite score: WPM (primary), Accuracy (secondary), Time (tertiary)
  return wpm * 1000000 + accuracy * 1000 + (invertedTime / 1000000000);
}

// Parse member from leaderboard entry
export function parseLeaderboardMember(member: string): {
  userId: string;
  entryId: string;
} {
  const [userId, entryId] = member.split(':');
  return { userId, entryId };
}

// Create member string for leaderboard entry
export function createLeaderboardMember(userId: string, entryId: string): string {
  return `${userId}:${entryId}`;
}
