import { describe, expect, it } from 'vitest';
import { mapLeaderboardEntries } from './leaderboard';

const rawEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'entry-1',
  user_id: 'user-12345678',
  wpm: 80,
  accuracy: 95,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('mapLeaderboardEntries', () => {
  it('assigns rank based on offset and index', () => {
    const entries = [rawEntry({ id: 'a' }), rawEntry({ id: 'b' }), rawEntry({ id: 'c' })];
    const result = mapLeaderboardEntries(entries, 20, {});
    expect(result.map((e) => e.rank)).toEqual([21, 22, 23]);
  });

  it('prefers username/email from the joined profile', () => {
    const entries = [
      rawEntry({ profiles: { username: 'joined_name', email: 'joined@example.com' } }),
    ];
    const result = mapLeaderboardEntries(entries, 0, {
      'user-12345678': { username: 'fallback_name', email: 'fallback@example.com' },
    });
    expect(result[0].username).toBe('joined_name');
    expect(result[0].email).toBe('joined@example.com');
  });

  it('falls back to the profile map when join data is missing', () => {
    const entries = [rawEntry()];
    const result = mapLeaderboardEntries(entries, 0, {
      'user-12345678': { username: 'fallback_name', email: 'fallback@example.com' },
    });
    expect(result[0].username).toBe('fallback_name');
    expect(result[0].email).toBe('fallback@example.com');
  });

  it('falls back to a generated username and empty email when nothing is known', () => {
    const entries = [rawEntry()];
    const result = mapLeaderboardEntries(entries, 0, {});
    expect(result[0].username).toBe('User user-123');
    expect(result[0].email).toBe('');
  });
});
