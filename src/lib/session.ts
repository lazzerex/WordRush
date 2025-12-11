import { redis, isRedisConfigured } from './redis';

/**
 * Session storage using Redis
 * Stores temporary session data with automatic expiration
 */

export interface TypingSession {
  userId: string;
  startTime: number;
  duration: number;
  wordList: string[];
  theme: string;
  expectedWords: string[];
}

const SESSION_TTL = 300; // 5 minutes in seconds
const SESSION_PREFIX = 'session:typing';

/**
 * Create a new typing test session
 */
export async function createTypingSession(
  sessionId: string,
  data: TypingSession
): Promise<boolean> {
  if (!isRedisConfigured()) {
    console.log('Redis not configured, skipping session storage');
    return false;
  }

  try {
    await redis.setex(
      `${SESSION_PREFIX}:${sessionId}`,
      SESSION_TTL,
      JSON.stringify(data)
    );
    console.log(`✅ Created typing session: ${sessionId}`);
    return true;
  } catch (error) {
    console.error('Error creating typing session:', error);
    return false;
  }
}

/**
 * Get typing test session
 */
export async function getTypingSession(
  sessionId: string
): Promise<TypingSession | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    const data = await redis.get<string>(`${SESSION_PREFIX}:${sessionId}`);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data) as TypingSession;
  } catch (error) {
    console.error('Error getting typing session:', error);
    return null;
  }
}

/**
 * Delete typing test session
 */
export async function deleteTypingSession(sessionId: string): Promise<boolean> {
  if (!isRedisConfigured()) {
    return false;
  }

  try {
    await redis.del(`${SESSION_PREFIX}:${sessionId}`);
    console.log(`🗑️ Deleted typing session: ${sessionId}`);
    return true;
  } catch (error) {
    console.error('Error deleting typing session:', error);
    return false;
  }
}

/**
 * Extend session TTL (e.g., when user is actively typing)
 */
export async function extendTypingSession(
  sessionId: string,
  additionalSeconds: number = SESSION_TTL
): Promise<boolean> {
  if (!isRedisConfigured()) {
    return false;
  }

  try {
    await redis.expire(`${SESSION_PREFIX}:${sessionId}`, additionalSeconds);
    return true;
  } catch (error) {
    console.error('Error extending typing session:', error);
    return false;
  }
}

/**
 * User streak tracking
 */
const STREAK_PREFIX = 'streak:user';
const STREAK_TTL = 86400 * 7; // 7 days

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string; // YYYY-MM-DD
}

/**
 * Update user's daily streak
 */
export async function updateUserStreak(userId: string): Promise<UserStreak | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    const key = `${STREAK_PREFIX}:${userId}`;
    const data = await redis.get<UserStreak>(key);
    
    const today = new Date().toISOString().split('T')[0];
    let streak: UserStreak;

    if (!data) {
      // First activity
      streak = {
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      };
    } else {
      const existing = data; // Already an object, no need to parse
      const lastDate = new Date(existing.lastActivityDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        // Same day, no change
        return existing;
      } else if (diffDays === 1) {
        // Consecutive day, increment streak
        streak = {
          currentStreak: existing.currentStreak + 1,
          longestStreak: Math.max(existing.longestStreak, existing.currentStreak + 1),
          lastActivityDate: today,
        };
      } else {
        // Streak broken, reset
        streak = {
          currentStreak: 1,
          longestStreak: existing.longestStreak,
          lastActivityDate: today,
        };
      }
    }

    await redis.setex(key, STREAK_TTL, JSON.stringify(streak));
    console.log(`🔥 Updated streak for user ${userId}: ${streak.currentStreak} days`);
    return streak;
  } catch (error) {
    console.error('Error updating user streak:', error);
    return null;
  }
}

/**
 * Get user's current streak
 */
export async function getUserStreak(userId: string): Promise<UserStreak | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    const data = await redis.get<string>(`${STREAK_PREFIX}:${userId}`);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data) as UserStreak;
  } catch (error) {
    console.error('Error getting user streak:', error);
    return null;
  }
}

/**
 * Active user tracking (for online counter)
 */
const ACTIVE_USERS_KEY = 'active:users';
const ACTIVE_USER_TTL = 60; // 1 minute

/**
 * Mark user as active
 */
export async function markUserActive(userId: string): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  try {
    const timestamp = Date.now();
    await redis.zadd(ACTIVE_USERS_KEY, { score: timestamp, member: userId });
    // Clean up inactive users (older than 2 minutes)
    const twoMinutesAgo = timestamp - 120000;
    await redis.zremrangebyscore(ACTIVE_USERS_KEY, 0, twoMinutesAgo);
  } catch (error) {
    console.error('Error marking user active:', error);
  }
}

/**
 * Get count of active users
 */
export async function getActiveUsersCount(): Promise<number> {
  if (!isRedisConfigured()) {
    return 0;
  }

  try {
    const count = await redis.zcard(ACTIVE_USERS_KEY);
    return count || 0;
  } catch (error) {
    console.error('Error getting active users count:', error);
    return 0;
  }
}
