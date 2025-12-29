// =====================================================
// Chat Helper Utilities
// =====================================================
// Guest ID management, profanity filtering, and message validation

// =====================================================
// Guest ID Management (Native crypto, no dependencies)
// =====================================================

const GUEST_DATA_KEY = 'wordrush_guest_data';

export interface GuestData {
  id: string;           // UUID for internal use
  displayName: string;  // guest_123456 format
  createdAt: number;    // timestamp
}

/**
 * Generate guest data with unique ID and readable display name
 * Uses native crypto.randomUUID() - no dependencies needed
 */
function generateGuestData(): GuestData {
  // Permanent unique ID for internal use (UUID format)
  const uniqueId = crypto.randomUUID();
  
  // Human-readable display name using last 6 digits of timestamp
  const displayNumber = Date.now().toString().slice(-6);
  
  return {
    id: uniqueId,
    displayName: `guest_${displayNumber}`,
    createdAt: Date.now(),
  };
}

/**
 * Get or create guest data from sessionStorage
 * Persists across page refreshes within the same session
 * Returns: { id: UUID, displayName: "guest_123456", createdAt: timestamp }
 */
export function getOrCreateGuestId(): GuestData {
  if (typeof window === 'undefined') {
    return {
      id: crypto.randomUUID(),
      displayName: `guest_${Date.now().toString().slice(-6)}`,
      createdAt: Date.now(),
    };
  }

  try {
    const stored = sessionStorage.getItem(GUEST_DATA_KEY);
    
    if (stored) {
      const guestData = JSON.parse(stored) as GuestData;
      return guestData;
    }
    
    // Create new guest data
    const guestData = generateGuestData();
    sessionStorage.setItem(GUEST_DATA_KEY, JSON.stringify(guestData));
    return guestData;
  } catch (error) {
    console.error('Error managing guest data:', error);
    return generateGuestData();
  }
}

/**
 * Clear guest data from sessionStorage
 * Useful when user logs in
 */
export function clearGuestData(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(GUEST_DATA_KEY);
  }
}

// =====================================================
// Profanity Filter
// =====================================================

// Basic profanity list (expand as needed)
const PROFANITY_LIST = [
  'damn',
  'hell',
  'crap',
  'shit',
  'fuck',
  'bitch',
  'ass',
  'bastard',
  'dick',
  'piss',
  // Add more as needed
];

/**
 * Check if message contains profanity
 * Returns the first detected profane word, or null if clean
 */
export function detectProfanity(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  for (const word of PROFANITY_LIST) {
    // Check for whole word matches (with word boundaries)
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerMessage)) {
      return word;
    }
  }
  
  return null;
}

/**
 * Filter profanity from message by replacing with asterisks
 */
export function filterProfanity(message: string): string {
  let filtered = message;
  
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, (match) => '*'.repeat(match.length));
  }
  
  return filtered;
}

// =====================================================
// Message Validation
// =====================================================

export const MESSAGE_CONSTRAINTS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 500,
  RATE_LIMIT_MESSAGES: 5,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
};

/**
 * Validate message content
 */
export function validateMessage(message: string): {
  valid: boolean;
  error?: string;
} {
  // Check if message is empty
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  // Check minimum length
  if (message.trim().length < MESSAGE_CONSTRAINTS.MIN_LENGTH) {
    return { valid: false, error: 'Message is too short' };
  }

  // Check maximum length
  if (message.length > MESSAGE_CONSTRAINTS.MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Message exceeds ${MESSAGE_CONSTRAINTS.MAX_LENGTH} characters` 
    };
  }

  // Check for profanity
  const profaneWord = detectProfanity(message);
  if (profaneWord) {
    return { 
      valid: false, 
      error: 'Message contains inappropriate language' 
    };
  }

  // Check for excessive caps (spam detection)
  const capsPercentage = (message.match(/[A-Z]/g) || []).length / message.length;
  if (message.length > 10 && capsPercentage > 0.7) {
    return { valid: false, error: 'Please avoid excessive caps' };
  }

  // Check for repeated characters (spam detection)
  if (/(.)\1{9,}/.test(message)) {
    return { valid: false, error: 'Message contains too many repeated characters' };
  }

  return { valid: true };
}

/**
 * Sanitize message for safe display
 */
export function sanitizeMessage(message: string): string {
  return message
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .slice(0, MESSAGE_CONSTRAINTS.MAX_LENGTH);
}

// =====================================================
// Time Formatting
// =====================================================

/**
 * Format timestamp as relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
}

/**
 * Check if message is about to expire
 * Returns time remaining in minutes, or null if not expiring soon
 */
export function getExpiryWarning(
  createdAt: string | Date,
  isGuest: boolean
): { expiring: boolean; minutesRemaining: number } | null {
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const expiryMs = isGuest ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 1hr or 24hr
  const remainingMs = expiryMs - diffMs;
  const remainingMinutes = Math.floor(remainingMs / (60 * 1000));

  // Warn if less than 5 minutes remaining
  if (remainingMinutes < 5 && remainingMinutes > 0) {
    return { expiring: true, minutesRemaining: remainingMinutes };
  }

  return null;
}

// =====================================================
// Chat Message Types
// =====================================================

export interface ChatMessage {
  id: string;
  user_id: string | null;
  guest_id: string | null;
  username: string;
  message: string;
  is_guest: boolean;
  created_at: string;
}

export interface SendMessageParams {
  message: string;
  userId?: string;
  guestId?: string;
  username: string;
  isGuest: boolean;
}
