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
  allResults: TypingResult[];
}

export interface Profile {
  id: string;
  username: string;
  email: string;
  coins: number;
  created_at: string;
  updated_at: string;
  elo_rating?: number;
  wins?: number;
  losses?: number;
  matches_played?: number;
  last_ranked_at?: string | null;
}

export interface Theme {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price: number;
  preview_colors: {
    background: string;
    text: string;
    accent: string;
  };
  css_variables: Record<string, string>;
  is_default: boolean;
  created_at: string;
}

export interface UserTheme {
  id: string;
  user_id: string;
  theme_id: string;
  purchased_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  active_theme_id: string;
  created_at: string;
  updated_at: string;
}

export interface MultiplayerMatch {
  id: string;
  duration: number;
  state: 'pending' | 'countdown' | 'in-progress' | 'completed';
  word_sequence: string[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface MultiplayerMatchPlayer {
  id: string;
  match_id: string;
  user_id: string;
  is_host: boolean;
  wpm: number | null;
  accuracy: number | null;
  progress: number;
  is_ready: boolean;
  is_finished: boolean;
  result: 'win' | 'loss' | 'draw' | null;
  created_at: string;
  updated_at: string;
  display_name?: string | null;
}
