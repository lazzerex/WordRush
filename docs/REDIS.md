# Redis Features Guide

This guide explains all Redis-powered features in WordRush and how to use them.

## 🛡️ Rate Limiting

### Overview
Prevents API abuse and spam by limiting the number of requests per time window.

### Implemented Endpoints

| Endpoint | Limit | Window | Identifier |
|----------|-------|--------|-----------|
| `/api/submit-result` | 20 requests | 60 seconds | User ID |
| `/api/leaderboard` | 30 requests | 60 seconds | IP Address |
| `/api/auth/*` | 5 requests | 60 seconds | IP Address |
| `/api/shop/purchase` | 10 requests | 60 seconds | User ID |

### How It Works

```typescript
// Example from submit-result API
import { checkRateLimit, getRateLimitIdentifier, testSubmissionLimiter } from '@/lib/ratelimit';

// Check rate limit
const identifier = getRateLimitIdentifier(request, user.id);
const rateLimitResult = await checkRateLimit(testSubmissionLimiter, identifier);

if (!rateLimitResult.success) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.reset),
      }
    }
  );
}
```

### Response Headers

When rate limited, the API returns these headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### Algorithm

Uses **Sliding Window** algorithm from `@upstash/ratelimit`:
- More accurate than fixed window
- Prevents burst attacks at window boundaries
- Smooth rate limiting experience

### Adding Rate Limiting to New Endpoints

```typescript
// 1. Import the limiter
import { checkRateLimit, generalLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';

// 2. Check at the start of your handler
export async function POST(request: NextRequest) {
  const identifier = getRateLimitIdentifier(request, userId); // userId optional
  const result = await checkRateLimit(generalLimiter, identifier);
  
  if (!result.success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  // Continue with your logic...
}
```

## 💾 Session Storage

### Overview
Stores temporary typing test sessions to enable session validation and recovery.

### Use Cases
1. **Session Validation**: Verify test completion against started session
2. **Anti-Cheat**: Validate submitted words match session's expected words
3. **Recovery**: Restore session if page refreshes mid-test

### API

```typescript
import { createTypingSession, getTypingSession, deleteTypingSession } from '@/lib/session';

// Create session when test starts
await createTypingSession('session-123', {
  userId: 'user-abc',
  startTime: Date.now(),
  duration: 30,
  wordList: ['hello', 'world', ...],
  theme: 'default',
  expectedWords: ['hello', 'world', ...],
});

// Validate session when test submits
const session = await getTypingSession('session-123');
if (!session) {
  return { error: 'Invalid or expired session' };
}

// Clean up after successful submission
await deleteTypingSession('session-123');
```

### TTL
- **Duration**: 5 minutes
- **Auto-cleanup**: Redis automatically removes expired sessions
- **Extension**: Can extend TTL if needed

## 🔥 User Streaks

### Overview
Tracks consecutive days of activity to gamify engagement.

### Features
- **Current Streak**: Number of consecutive days with activity
- **Longest Streak**: Personal record
- **Auto-reset**: Breaks if user misses a day
- **Persistence**: 7-day TTL (extends on activity)

### API

```typescript
import { updateUserStreak, getUserStreak } from '@/lib/session';

// Update streak (call after test submission)
const streak = await updateUserStreak('user-123');
console.log(`Current streak: ${streak.currentStreak} days`);
console.log(`Longest streak: ${streak.longestStreak} days`);

// Get current streak (for profile display)
const streak = await getUserStreak('user-123');
```

### Response Format

```typescript
interface UserStreak {
  currentStreak: number;        // e.g., 5
  longestStreak: number;        // e.g., 12
  lastActivityDate: string;     // e.g., "2025-11-17"
}
```

### Integration with Submit Result

The streak is automatically updated when users complete tests:

```typescript
// In /api/submit-result
const streak = await updateUserStreak(user.id);

return NextResponse.json({
  data: {
    wpm,
    accuracy,
    coinsEarned,
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
    }
  }
});
```

### Displaying Streaks

```tsx
// Example component
function UserProfile() {
  const [streak, setStreak] = useState(null);
  
  useEffect(() => {
    fetch('/api/user/streak')
      .then(res => res.json())
      .then(data => setStreak(data.data));
  }, []);
  
  return (
    <div>
      🔥 {streak?.currentStreak || 0} day streak!
      <span>Best: {streak?.longestStreak || 0} days</span>
    </div>
  );
}
```

## 👥 Active Users Counter

### Overview
Shows real-time count of active users (typing or browsing).

### How It Works
1. Client marks user as active every 30 seconds
2. Redis stores users in sorted set with timestamps
3. Auto-cleanup removes users inactive for >2 minutes
4. Counter displays total active users

### API

```typescript
import { markUserActive, getActiveUsersCount } from '@/lib/session';

// Mark user as active (call from client every 30s)
await markUserActive('user-123');

// Get count for display
const count = await getActiveUsersCount();
console.log(`${count} users online`);
```

### Integration

Already integrated in `OnlinePlayersCounter` component:

```tsx
// Automatically updates every 30 seconds
<OnlinePlayersCounter />
// Displays: "5 players are typing"
```

### Endpoints

- **GET** `/api/active-users` - Get current count
- **POST** `/api/active-users` - Mark current user as active

## 📦 Leaderboard Caching

### Overview
Caches leaderboard data to reduce PostgreSQL load by ~90%.

### Data Structures

**Sorted Set** (`leaderboard:{duration}`):
- Stores user rankings
- Score = `wpm * 1,000,000 + accuracy * 1,000 + timestamp_inverse`
- Allows efficient range queries

**Hash** (`entry:{entryId}`):
- Stores full entry details
- Fields: id, user_id, username, email, wpm, accuracy, created_at, duration

### Cache Strategy

1. **Read-through**: Check cache first, fallback to database
2. **Write-through**: Update cache when new results submitted
3. **Background Refresh**: Populate cache on miss
4. **TTL**: 1 hour expiry on entries

### Pipeline Batching

Reduces Redis calls by 90% per page load:

```typescript
// Instead of 10 separate calls:
// for (const entry of entries) {
//   await redis.hgetall(entryKey);
// }

// Use pipeline (1 Redis call):
const pipeline = redis.pipeline();
entries.forEach(entry => {
  pipeline.hgetall(LEADERBOARD_KEYS.entry(entry.id));
});
const results = await pipeline.exec();
```

## 🔧 Configuration

### Environment Variables

```bash
# Required for all Redis features
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### Disabling Features

All Redis features gracefully degrade if Redis is not configured:

```typescript
// Example: Rate limiting disabled without Redis
if (!isRedisConfigured()) {
  console.log('Redis not configured, allowing request');
  return { success: true };
}
```

### Feature Flags

To disable specific features while keeping others:

```typescript
// In src/lib/session.ts
export async function markUserActive(userId: string): Promise<void> {
  if (!isRedisConfigured() || !ENABLE_ACTIVE_USERS) {
    return;
  }
  // ... implementation
}
```

## 📊 Monitoring

### Redis Dashboard (Upstash)

Monitor these metrics in your Upstash Console:

1. **Daily Commands**: Total Redis operations
2. **Command Breakdown**: Read vs Write ratio
3. **Memory Usage**: Total keys and data size
4. **Latency**: P50, P95, P99 response times
5. **Error Rate**: Failed operations

### Expected Usage (100 Active Users)

- **Leaderboard**: ~72,500 commands/day
- **Rate Limiting**: ~11,000 commands/day
- **Active Users**: ~43,200 commands/day
- **Streaks**: ~1,500 commands/day
- **Total**: ~128,200 commands/day

### Optimization Tips

1. **Reduce Active Users Polling**: Change from 30s to 60s
2. **Disable Streaks**: If not displayed in UI
3. **Increase Cache TTL**: From 1hr to 6hr for leaderboard
4. **Batch Operations**: Always use pipeline for multiple operations

## 🐛 Debugging

### Enable Debug Logging

```typescript
// In any Redis operation
try {
  const result = await redis.get('key');
  console.log('Redis result:', result);
} catch (error) {
  console.error('Redis error:', error);
}
```

### Common Issues

**Rate Limit False Positives**:
- Check if user ID or IP is being extracted correctly
- Verify `getRateLimitIdentifier()` returns consistent values

**Session Not Found**:
- Check if TTL expired (5 minutes)
- Verify session ID matches between create and get

**Streak Not Updating**:
- Ensure `updateUserStreak()` is called after successful test
- Check if date comparison logic is working (timezone issues)

**Active Users Count Wrong**:
- Verify cleanup logic is removing stale users
- Check if timestamps are being set correctly

## 🚀 Best Practices

1. **Always Handle Failures**: Redis operations should fail gracefully
2. **Use Pipelines**: Batch multiple operations into one
3. **Set Appropriate TTLs**: Prevent memory bloat
4. **Monitor Usage**: Stay within your tier limits
5. **Test Without Redis**: Ensure app works when Redis is unavailable
6. **Rate Limit Wisely**: Don't make limits too restrictive
7. **Cache Invalidation**: Clear cache when data changes significantly

## 📚 Additional Resources

- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [@upstash/ratelimit Docs](https://github.com/upstash/ratelimit)
- [Redis Data Structures](https://redis.io/docs/data-types/)
- [Sliding Window Rate Limiting](https://en.wikipedia.org/wiki/Rate_limiting#Algorithms)
