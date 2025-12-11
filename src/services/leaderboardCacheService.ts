import { redis, LEADERBOARD_KEYS, calculateLeaderboardScore, createLeaderboardMember, parseLeaderboardMember, isRedisConfigured } from '@/lib/redis';
import type { LeaderboardEntry } from '@/types/leaderboard';
import { getLeaderboardPaginated } from '@/lib/leaderboard';

const CACHE_TTL = 3600; // 1 hour in seconds
const MAX_LEADERBOARD_SIZE = 1000; // Keep top 1000 entries per duration

/**
 * Add a new typing result to the Redis leaderboard cache
 */
export async function addToLeaderboardCache(entry: {
  id: string;
  user_id: string;
  username: string;
  email: string;
  wpm: number;
  accuracy: number;
  created_at: string;
  duration: number;
  language?: string;
}): Promise<void> {
  if (!isRedisConfigured()) {
    console.log('Redis not configured, skipping cache update');
    return;
  }

  try {
    const score = calculateLeaderboardScore(entry.wpm, entry.accuracy, entry.created_at);
    const member = createLeaderboardMember(entry.user_id, entry.id);
    const leaderboardKey = LEADERBOARD_KEYS.leaderboard(entry.duration);
    const entryKey = LEADERBOARD_KEYS.entry(entry.id);

    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Add to sorted set
    pipeline.zadd(leaderboardKey, { score, member });

    // Store full entry details in a hash
    pipeline.hset(entryKey, {
      id: entry.id,
      user_id: entry.user_id,
      username: entry.username,
      email: entry.email,
      wpm: entry.wpm,
      accuracy: entry.accuracy,
      created_at: entry.created_at,
      duration: entry.duration,
      language: entry.language || 'en',
    });

    // Set TTL on entry
    pipeline.expire(entryKey, CACHE_TTL);

    // Trim leaderboard to top N entries
    pipeline.zremrangebyrank(leaderboardKey, 0, -(MAX_LEADERBOARD_SIZE + 1));

    // Execute all commands
    await pipeline.exec();

    console.log(`✅ Added entry ${entry.id} to leaderboard cache for duration ${entry.duration}`);
  } catch (error) {
    console.error('Error adding to leaderboard cache:', error);
    // Don't throw - cache failures shouldn't break the app
  }
}

/**
 * Get leaderboard from Redis cache with pagination
 */
export async function getLeaderboardFromCache(
  duration: number,
  page: number = 1,
  pageSize: number = 10
): Promise<{ entries: LeaderboardEntry[]; total: number } | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    const leaderboardKey = LEADERBOARD_KEYS.leaderboard(duration);
    
    // Get total count
    const total = await redis.zcard(leaderboardKey);
    
    if (!total || total === 0) {
      return null;
    }

    // Calculate offset
    const offset = (page - 1) * pageSize;
    const end = offset + pageSize - 1;

    // Get members with scores (highest to lowest)
    const membersWithScores = await redis.zrange(leaderboardKey, offset, end, {
      rev: true,
      withScores: true,
    });

    if (!membersWithScores || membersWithScores.length === 0) {
      return { entries: [], total };
    }

    // Parse members and batch fetch entry details using pipeline (more efficient)
    const entries: LeaderboardEntry[] = [];
    const pipeline = redis.pipeline();
    const entryIds: string[] = [];
    
    // Build pipeline to fetch all entries at once
    for (let i = 0; i < membersWithScores.length; i += 2) {
      const member = membersWithScores[i] as string;
      const { entryId } = parseLeaderboardMember(member);
      entryIds.push(entryId);
      pipeline.hgetall(LEADERBOARD_KEYS.entry(entryId));
    }
    
    // Execute all fetches in one Redis call
    const results = await pipeline.exec();
    
    // Process results
    if (results && Array.isArray(results)) {
      results.forEach((result: any, index: number) => {
        const entryData = result;
        if (entryData && typeof entryData === 'object') {
          entries.push({
            id: String(entryData.id || ''),
            user_id: String(entryData.user_id || ''),
            username: String(entryData.username || 'Unknown'),
            email: String(entryData.email || ''),
            wpm: Number(entryData.wpm || 0),
            accuracy: Number(entryData.accuracy || 0),
            created_at: String(entryData.created_at || new Date().toISOString()),
            rank: offset + index + 1,
          });
        }
      });
    }

    return { entries, total };
  } catch (error) {
    console.error('Error fetching from leaderboard cache:', error);
    return null;
  }
}

/**
 * Get user's rank from cache
 */
export async function getUserRankFromCache(
  userId: string,
  duration: number
): Promise<{ rank: number; total: number } | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    const leaderboardKey = LEADERBOARD_KEYS.leaderboard(duration);
    
    // Find user's best entry in the leaderboard
    const members = await redis.zrange(leaderboardKey, 0, -1, { rev: true });
    
    if (!members) {
      return null;
    }

    let userRank = -1;
    for (let i = 0; i < members.length; i++) {
      const member = members[i] as string;
      const { userId: memberId } = parseLeaderboardMember(member);
      
      if (memberId === userId) {
        userRank = i + 1;
        break;
      }
    }

    if (userRank === -1) {
      return null;
    }

    const total = await redis.zcard(leaderboardKey);
    
    return {
      rank: userRank,
      total: total || 0,
    };
  } catch (error) {
    console.error('Error fetching user rank from cache:', error);
    return null;
  }
}

/**
 * Refresh the entire leaderboard cache from database
 * This should be called periodically or when cache is empty
 */
export async function refreshLeaderboardCache(duration: number): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  try {
    console.log(`Refreshing leaderboard cache for duration ${duration}...`);
    
    // Fetch top entries from database
    const { entries } = await getLeaderboardPaginated(duration, MAX_LEADERBOARD_SIZE, 0);
    
    if (entries.length === 0) {
      console.log(`No entries found for duration ${duration}`);
      return;
    }

    const leaderboardKey = LEADERBOARD_KEYS.leaderboard(duration);
    
    // Clear existing cache
    await redis.del(leaderboardKey);
    
    // Add all entries
    const pipeline = redis.pipeline();
    
    for (const entry of entries) {
      const score = calculateLeaderboardScore(entry.wpm, entry.accuracy, entry.created_at);
      const member = createLeaderboardMember(entry.user_id, entry.id);
      const entryKey = LEADERBOARD_KEYS.entry(entry.id);
      
      pipeline.zadd(leaderboardKey, { score, member });
      pipeline.hset(entryKey, {
        id: entry.id,
        user_id: entry.user_id,
        username: entry.username,
        email: entry.email,
        wpm: entry.wpm,
        accuracy: entry.accuracy,
        created_at: entry.created_at,
        duration: duration,
      });
      pipeline.expire(entryKey, CACHE_TTL);
    }
    
    await pipeline.exec();
    
    console.log(`Successfully refreshed cache for duration ${duration} with ${entries.length} entries`);
  } catch (error) {
    console.error('Error refreshing leaderboard cache:', error);
  }
}

/**
 * Clear all leaderboard caches
 */
export async function clearLeaderboardCache(): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  try {
    const durations = [15, 30, 60, 120];
    
    for (const duration of durations) {
      const leaderboardKey = LEADERBOARD_KEYS.leaderboard(duration);
      await redis.del(leaderboardKey);
    }
    
    console.log('Cleared all leaderboard caches');
  } catch (error) {
    console.error('Error clearing leaderboard cache:', error);
  }
}
