it # Architecture: Live Leaderboard System

## Overview

The live leaderboard system uses a **hybrid architecture** combining Supabase Realtime for instant updates and Redis for high-performance caching.

## Architecture Decisions

### Why Supabase Realtime for Live Updates?

**Chosen:** Supabase Realtime (PostgreSQL LISTEN/NOTIFY)
**Rejected:** Redis SSE Polling, Redis Pub/Sub

**Reasons:**
1. **Instant Updates**: PostgreSQL native pub/sub provides real-time notifications with zero polling delay
2. **Zero Redis Usage**: No constant polling = no Redis read operations for updates
3. **Already in Stack**: Supabase is our primary database, Realtime comes free with all plans
4. **Event-Driven**: Only fires when actual INSERTs occur on `typing_results` table
5. **Scalable**: Supabase handles WebSocket connections, connection pooling, and reconnection logic

**Why Not Redis SSE?**
- Redis REST API (HTTP-based) doesn't support blocking pub/sub like native Redis (TCP)
- Polling-based SSE requires constant Redis reads:
  - Every 1s = 86,400 reads/day per client
  - Every 5s = 17,280 reads/day per client  
  - Even every 30s = 2,880 reads/day per client
- Free tier only allows 10K commands/day = supports only 3-5 concurrent users with polling

### Why Redis for Caching, Rate Limiting & Sessions?

**Use Cases:**
1. **Leaderboard Caching**: Sorted sets + hashes provide O(log n) ranking queries
2. **Database Load Reduction**: ~90% fewer queries to PostgreSQL
3. **Rate Limiting**: Sliding window algorithm protects API endpoints from abuse
   - Test submissions: 20/min per user
   - Leaderboard API: 30/min per IP
   - Auth endpoints: 5/min per IP
   - Purchases: 10/min per user
4. **Session Storage**: Temporary typing test sessions with auto-expiry
5. **User Streaks**: Daily activity tracking with consecutive day counting
6. **Active Users**: Real-time counter showing online players

**Redis Data Structures:**

| Key Pattern | Type | Purpose | TTL | Example |
|------------|------|---------|-----|---------|
| `leaderboard:{duration}` | Sorted Set | Stores composite scores for ranking | None | `leaderboard:30` |
| `entry:{entryId}` | Hash | Full entry details (username, wpm, etc.) | 1 hour | `entry:abc123` |
| `ratelimit:test-submission:{id}` | String | Rate limit counter | 60s | `ratelimit:test-submission:user:xyz` |
| `ratelimit:leaderboard:{id}` | String | Rate limit counter | 60s | `ratelimit:leaderboard:ip:1.2.3.4` |
| `ratelimit:auth:{id}` | String | Rate limit counter | 60s | `ratelimit:auth:ip:1.2.3.4` |
| `ratelimit:purchase:{id}` | String | Rate limit counter | 60s | `ratelimit:purchase:user:xyz` |
| `session:typing:{sessionId}` | String (JSON) | Active typing session | 5 min | `session:typing:sess_123` |
| `streak:user:{userId}` | String (JSON) | User daily streak data | 7 days | `streak:user:user_xyz` |
| `active:users` | Sorted Set | Online users with timestamps | None | `active:users` |

**Key Features:**
- **Composite Scoring**: `wpm * 1,000,000 + accuracy * 1,000 + timestamp_inverse`
- **Pipeline Operations**: Batch fetches reduce Redis calls by 90% per page load
- **TTL Management**: Automatic cleanup of expired data
- **Sliding Window**: Rate limiting uses @upstash/ratelimit library

## Data Flow

### When User Submits Test Result

```
1. Client submits test → POST /api/submit-result
2. Check rate limit (20 submissions/min per user)
   - If exceeded: Return 429 Too Many Requests
   - If allowed: Continue
3. Server validates and saves to PostgreSQL (typing_results table)
4. Server updates Redis cache (sorted set + hash)
5. Update user daily streak (increment if consecutive day)
6. Award WRCoins based on duration
7. PostgreSQL triggers Realtime INSERT notification
8. All subscribed clients receive instant notification
9. Clients refresh leaderboard (fetch from Redis cache or DB fallback)
10. Return response with WPM, accuracy, coins, and streak data
```

### Leaderboard Page Load

```
1. Client requests leaderboard → GET /api/leaderboard?duration=30
2. Check rate limit (30 requests/min per IP)
   - If exceeded: Return 429 Too Many Requests
   - If allowed: Continue
3. Server checks Redis cache first
4. If cache hit: Return cached data (fast!)
5. If cache miss: Query PostgreSQL + populate Redis + return data
6. Client subscribes to Supabase Realtime channel for live updates
7. Client polls active users count every 30 seconds
```

## Performance Metrics

### Redis Usage (Per Day)
- **Leaderboard Cache Reads**: ~12 reads per page load
- **Cache Writes**: ~5 writes per test submission
- **Rate Limit Checks**: ~2 reads per API call
- **Active Users**: ~2 writes + 1 read per 30s (per client)
- **Streak Updates**: ~2 reads + 1 write per test submission
- **No Polling Reads**: 0 for live updates (thanks to Supabase Realtime!)

**Example with 100 active users (moderate activity):**
- 500 test submissions/day:
  - Cache writes: 2,500
  - Rate limit checks: 1,000
  - Streak updates: 1,500
- 5,000 leaderboard page loads:
  - Cache reads: 60,000
  - Rate limit checks: 10,000
- Active users tracking (100 users × 30s intervals):
  - Writes: 28,800
  - Reads: 14,400
- **Total**: ~118,200 commands/day

**Free Tier Considerations:**
- Upstash Free Tier: 10,000 commands/day
- Recommended: Upgrade to paid tier ($10/month = 100K commands/day)
- Or: Disable non-essential features (active users, streaks) to stay within free tier

### Supabase Realtime
- **Connections**: Free tier supports 200 concurrent connections
- **Messages**: Unlimited (included in all plans)
- **Latency**: ~50-200ms from INSERT to client notification

## Migration Guide

### Required Steps

1. **Enable Realtime** for `typing_results` table:
   ```sql
   -- Run in Supabase SQL Editor
   alter publication supabase_realtime add table typing_results;
   ```

2. **Update Client Code**: 
   - Removed SSE EventSource
   - Added Supabase Realtime channel subscription
   - Filters by duration to reduce unnecessary refreshes

3. **Cleanup Redis Code**:
   - Removed SSE endpoint (`/api/leaderboard/updates/route.ts`)
   - Removed update timestamp keys (`last_update:{duration}`)
   - Kept cache service focused on caching only

## Implemented Redis Features

### Rate Limiting ✅
- **Test Submissions**: 20 requests/minute per user (prevents spam)
- **Leaderboard API**: 30 requests/minute per IP (prevents abuse)
- **Auth Endpoints**: 5 requests/minute per IP (prevents brute force)
- **Purchases**: 10 requests/minute per user (prevents exploits)
- **Algorithm**: Sliding window for smooth rate limiting
- **Analytics**: Built-in tracking for monitoring usage patterns

### Session Storage ✅
- **Typing Sessions**: Store active test sessions with 5-minute TTL
- **Auto-expiry**: Sessions clean up automatically
- **Data Stored**: User ID, start time, duration, word list, theme

### User Streaks ✅
- **Daily Tracking**: Consecutive days of activity
- **Streak Types**: Current streak + longest streak
- **Auto-reset**: Breaks if user misses a day
- **TTL**: 7-day expiry on streak data

### Active Users ✅
- **Real-time Counter**: Shows number of online players
- **Sorted Set**: Uses Redis sorted sets with timestamps
- **Auto-cleanup**: Removes inactive users (>2 minutes idle)
- **Efficient**: Single Redis call to get count

## Future Enhancements

### Redis Use Cases to Implement
- [ ] Leaderboard trending data (hot/cold cache tiers)
- [ ] Typing test history caching (recent tests per user)

### Supabase Realtime Use Cases
- [x] Live leaderboard updates ✅
- [x] Multiplayer match updates ✅
- [ ] Live typing race mode (multiple users typing same words)
- [ ] Global notifications (achievements, badges)

## Monitoring

### Key Metrics to Watch

**Supabase:**
- Database response time (should be <100ms with Redis cache)
- Realtime connection count (max 200 on free tier)
- Database CPU usage (cache should reduce this significantly)

**Upstash Redis:**
- Daily command count (free tier = 10K/day)
- Cache hit rate (should be >80%)
- Average key size (sorted sets should be <1MB)

**Vercel:**
- API route response time (`/api/leaderboard` should be <200ms)
- Function invocations (watch for excessive calls)

## References

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Upstash Redis Docs](https://upstash.com/docs/redis)
- [PostgreSQL LISTEN/NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)
- [Redis Sorted Sets](https://redis.io/docs/data-types/sorted-sets/)
