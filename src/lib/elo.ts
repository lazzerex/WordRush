/**
 * Reference implementation of the ELO algorithm documented in
 * docs/ELO_SYSTEM.md. Ranked match results are actually finalized by the
 * `finalize_ranked_match` Postgres RPC (SQL body not present in this repo -
 * see WORDRUSH_AUDIT_REPORT_7_6_2026.md), so this module is NOT wired into
 * the live rating flow. It exists as a tested, executable spec of the
 * documented formula to unblock unit testing of the ELO math.
 */

export type MatchOutcome = 'win' | 'draw' | 'loss';

const ACTUAL_SCORE: Record<MatchOutcome, number> = {
  win: 1,
  draw: 0.5,
  loss: 0,
};

export function getKFactor(matchesPlayed: number): number {
  if (matchesPlayed < 30) return 32;
  if (matchesPlayed < 100) return 24;
  return 16;
}

export function getExpectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export function calculateNewElo(
  rating: number,
  opponentRating: number,
  outcome: MatchOutcome,
  matchesPlayed: number
): number {
  const kFactor = getKFactor(matchesPlayed);
  const expectedScore = getExpectedScore(rating, opponentRating);
  const actualScore = ACTUAL_SCORE[outcome];
  return Math.round(rating + kFactor * (actualScore - expectedScore));
}
