# ELO Rating System Setup Guide

## Overview

The ELO rating system provides competitive ranked multiplayer matches with skill-based matchmaking and fair rating calculations.

## Features

- **Dynamic K-Factor**: Adjusts rating changes based on player experience
  - New players (< 30 games): K=32 (faster rating changes)
  - Intermediate (30-100 games): K=24
  - Experienced (100+ games): K=16 (more stable ratings)

- **Fair Matchmaking**: Players matched within ±200 ELO range
- **Win/Loss/Draw Tracking**: Complete match history
- **Rank Tiers**: Beginner → Intermediate → Advanced → Expert

## Setup Instructions

### 1. Run the Migration

Execute the SQL migration in your Supabase SQL Editor:

```bash
database/migrations/elo_system.sql
```

This creates:
- ELO columns in `profiles` table
- `multiplayer_queue` table for matchmaking
- ELO calculation functions
- Match finalization logic

### 2. Verify Installation

Test the ELO calculation:

```sql
-- Test: New player wins against equal opponent
SELECT calculate_new_elo(1000, 1000, 1.0, 0); 
-- Expected: 1016 (1000 + 32*0.5)

-- Test: Lower rated player beats higher rated
SELECT calculate_new_elo(1000, 1500, 1.0, 50);
-- Expected: ~1024 (big upset = big gain)

-- Test: Higher rated player beats lower rated
SELECT calculate_new_elo(1500, 1000, 1.0, 50);
-- Expected: ~1506 (expected win = small gain)
```

### 3. Test Matchmaking

1. Open two browser windows (or incognito + normal)
2. Sign in with different accounts
3. Both click "Find Match" in multiplayer
4. Should be matched within seconds

### 4. Verify ELO Updates

After completing a match:

```sql
-- Check your ELO rating
SELECT username, elo_rating, wins, losses, draws, matches_played
FROM profiles
WHERE id = 'your-user-id';
```

## ELO Rating Tiers

| ELO Range | Tier | Description |
|-----------|------|-------------|
| < 900 | Beginner | Learning the ropes |
| 900-1199 | Intermediate | Getting consistent |
| 1200-1499 | Advanced | Strong competitor |
| 1500+ | Expert | Top tier player |

## How ELO is Calculated

### Formula

```
New Rating = Old Rating + K × (Actual Score - Expected Score)
```

### Expected Score

```
E(A) = 1 / (1 + 10^((Rating_B - Rating_A) / 400))
```

### Actual Score
- Win: 1.0
- Draw: 0.5
- Loss: 0.0

### Example Calculations

**Example 1: Equal players (1000 vs 1000)**
- Expected score: 0.5 (50% chance to win)
- Winner: 1000 + 32 × (1.0 - 0.5) = 1016 (+16)
- Loser: 1000 + 32 × (0.0 - 0.5) = 984 (-16)

**Example 2: Upset (1000 vs 1500)**
- Lower player expected: 0.05 (5% chance)
- If lower player wins: 1000 + 32 × (1.0 - 0.05) = 1030 (+30)
- If higher player wins: 1500 + 24 × (1.0 - 0.95) = 1501 (+1)

**Example 3: Draw (1200 vs 1300)**
- Player A expected: 0.36
- Player A draw: 1200 + 24 × (0.5 - 0.36) = 1203 (+3)
- Player B draw: 1300 + 24 × (0.5 - 0.64) = 1297 (-3)

## Matchmaking Algorithm

1. Player enters queue with their ELO rating
2. System searches for opponent within ±200 ELO
3. If found: Create match immediately
4. If not found: Wait in queue for next player
5. Matches prioritize closest ELO and longest wait time

## Account Page Display

The account page now shows:
- Current ELO rating with rank tier
- Total matches played
- Wins, losses, and draws
- Win rate percentage
- Last ranked match timestamp

## Troubleshooting

### ELO not updating after match

1. Check if match completed successfully:
```sql
SELECT * FROM multiplayer_matches WHERE id = 'match-id';
```

2. Verify finalize function was called:
```sql
SELECT * FROM multiplayer_match_players WHERE match_id = 'match-id';
-- Check that both players have is_finished = true and result is set
```

3. Check for errors in Supabase logs

### Matchmaking takes too long

- Requires 2 players within ±200 ELO range
- During low activity, queue times may be longer
- Consider widening ELO range if needed:
  ```sql
  -- In enqueue_ranked_match function, change:
  AND elo_rating BETWEEN p_elo - 200 AND p_elo + 200
  -- To:
  AND elo_rating BETWEEN p_elo - 300 AND p_elo + 300
  ```

### Starting ELO not 1000

Check the default value in profiles table:
```sql
ALTER TABLE profiles
ALTER COLUMN elo_rating SET DEFAULT 1000;
```

## Future Enhancements

Planned improvements:
- [ ] Seasonal rankings with resets
- [ ] Leaderboard sorted by ELO
- [ ] Match history with ELO changes
- [ ] Performance-based ELO (bonus for high WPM)
- [ ] Decay for inactive players
- [ ] Placement matches for new players
