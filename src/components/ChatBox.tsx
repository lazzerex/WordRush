'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { 
  getOrCreateGuestId, 
  formatRelativeTime,
  validateMessage,
  type ChatMessage,
  type GuestData
} from '@/lib/chat';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Info, 
  X,
  Clock,
  Shield,
  AlertCircle
} from 'lucide-react';

export default function ChatBox() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState<string>('');
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Listen for menu open/close events
  useEffect(() => {
    const handleMenuOpen = () => {
      setIsMenuOpen(true);
      setIsOpen(false); // Auto-close chat when menu opens
    };
    
    const handleMenuClose = () => {
      setIsMenuOpen(false);
    };
    
    window.addEventListener('wordrush:openMenu', handleMenuOpen);
    window.addEventListener('wordrush:closeMenu', handleMenuClose);
    
    return () => {
      window.removeEventListener('wordrush:openMenu', handleMenuOpen);
      window.removeEventListener('wordrush:closeMenu', handleMenuClose);
    };
  }, []);

  // Get user info and load username
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Load username from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        setUsername(profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'User');
      } else {
        // Initialize guest data
        const guest = getOrCreateGuestId();
        setGuestData(guest);
        setUsername(guest.displayName);
      }
    };

    loadUserData();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        
        // Load username from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();
        
        setUsername(profile?.username || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User');
        setGuestData(null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        const guest = getOrCreateGuestId();
        setGuestData(guest);
        setUsername(guest.displayName);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load initial messages when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadMessages();
    }
  }, [isOpen]);

  // Setup realtime subscription
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setUserCount(Object.keys(state).length);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Handle user join
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Handle user leave
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const guest = !user ? getOrCreateGuestId() : null;
          await channel.track({
            user_id: user?.id || null,
            guest_id: guest?.id || null,
            username: user?.user_metadata?.username || guest?.displayName || 'Guest',
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [isOpen, user]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chat?limit=50');
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Validate message
    const validation = validateMessage(inputMessage);
    if (!validation.valid) {
      setError(validation.error || 'Invalid message');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSending(true);
    setError(null);

    try {
      const isGuest = !user;
      const guest = isGuest ? getOrCreateGuestId() : null;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          username,
          isGuest,
          guestId: guest?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setInputMessage('');
      
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-20 p-4 bg-yellow-500 hover:bg-yellow-400 rounded-full shadow-lg hover:scale-110 transition-all group"
        title="Open chat"
      >
        <MessageCircle className="w-6 h-6 text-zinc-900" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
          {userCount || ''}
        </span>
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-6 right-6 z-20 w-96 h-[600px] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-yellow-500" />
          <div>
            <h3 className="font-semibold text-zinc-100">Live Chat</h3>
            <p className="text-xs text-zinc-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {userCount} online
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-zinc-700 rounded-lg transition"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Signup incentive banner for guests */}
      {!user && (
        <div className="p-3 bg-yellow-500/10 border-b border-yellow-500/20 text-xs text-yellow-400 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Sign up</strong> to keep your messages for 24 hours! Guest messages expire in 1 hour.
          </p>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-yellow-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-zinc-500">
            <div>
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-xs mt-1">Be the first to say hello!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${
                msg.user_id === user?.id ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-medium ${
                  msg.is_guest ? 'text-zinc-500' : 'text-yellow-500'
                }`}>
                  {msg.is_guest && <Shield className="w-3 h-3 inline mr-1" />}
                  {msg.username}
                </span>
                <span className="text-zinc-600" title={new Date(msg.created_at).toLocaleString()}>
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {formatRelativeTime(msg.created_at)}
                </span>
              </div>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-xl ${
                  msg.user_id === user?.id
                    ? 'bg-yellow-500/20 border border-yellow-500/30 text-zinc-100'
                    : msg.is_guest
                    ? 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                    : 'bg-zinc-800 border border-zinc-600 text-zinc-200'
                }`}
              >
                <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-zinc-700 bg-zinc-800/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            placeholder="Type a message..."
            disabled={sending}
            maxLength={500}
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !inputMessage.trim()}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-zinc-900 rounded-lg transition font-medium flex items-center gap-2"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {inputMessage.length}/500 characters
        </p>
      </div>
    </div>
  );
}
