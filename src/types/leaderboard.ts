export interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  email: string;
  wpm: number;
  accuracy: number;
  created_at: string;
  rank?: number;
}

export interface LeaderboardData {
  [key: number]: LeaderboardEntry[]; // Key is duration (15, 30, 60, 120)
}
