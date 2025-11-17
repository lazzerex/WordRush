import { refreshLeaderboardCache, clearLeaderboardCache } from '@/services/leaderboardCacheService';
import { isRedisConfigured } from '@/lib/redis';

/**
 * Utility script to manage Redis cache
 * 
 * Usage:
 * - Refresh all caches: node scripts/cache-manager.js refresh
 * - Clear all caches: node scripts/cache-manager.js clear
 * - Check status: node scripts/cache-manager.js status
 */

async function refreshAll() {
  console.log('🔄 Refreshing all leaderboard caches...');
  const durations = [15, 30, 60, 120];
  
  for (const duration of durations) {
    try {
      await refreshLeaderboardCache(duration);
      console.log(`✅ Refreshed cache for ${duration}s duration`);
    } catch (error) {
      console.error(`❌ Failed to refresh ${duration}s duration:`, error);
    }
  }
  
  console.log('✨ All caches refreshed!');
}

async function clearAll() {
  console.log('🧹 Clearing all leaderboard caches...');
  
  try {
    await clearLeaderboardCache();
    console.log('✅ All caches cleared!');
  } catch (error) {
    console.error('❌ Failed to clear caches:', error);
  }
}

function checkStatus() {
  const isConfigured = isRedisConfigured();
  
  console.log('📊 Redis Configuration Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Redis Configured: ${isConfigured ? '✅ Yes' : '❌ No'}`);
  
  if (isConfigured) {
    console.log(`URL: ${process.env.UPSTASH_REDIS_REST_URL?.substring(0, 30)}...`);
    console.log(`Token: ${process.env.UPSTASH_REDIS_REST_TOKEN ? '***' + process.env.UPSTASH_REDIS_REST_TOKEN.substring(process.env.UPSTASH_REDIS_REST_TOKEN.length - 4) : 'Not set'}`);
  } else {
    console.log('⚠️  Redis not configured. App will use database fallback.');
    console.log('Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.');
  }
}

const command = process.argv[2];

switch (command) {
  case 'refresh':
    refreshAll().catch(console.error);
    break;
  case 'clear':
    clearAll().catch(console.error);
    break;
  case 'status':
    checkStatus();
    break;
  default:
    console.log('Usage: node scripts/cache-manager.js [command]');
    console.log('Commands:');
    console.log('  refresh - Refresh all leaderboard caches');
    console.log('  clear   - Clear all leaderboard caches');
    console.log('  status  - Check Redis configuration status');
}
