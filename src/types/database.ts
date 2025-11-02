export interface TypingResult {
  id: string;
  user_id: string;
  wpm: number;
  accuracy: number;
  correct_chars: number;
  incorrect_chars: number;
  duration: number;
  theme: string;
  created_at: string;
}

export interface UserStats {
  totalTests: number;
  averageWpm: number;
  averageAccuracy: number;
  highestWpm: number;
  recentTests: TypingResult[];
}
