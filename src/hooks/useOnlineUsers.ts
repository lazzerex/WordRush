'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useOnlineUsers() {
  const [onlineCount, setOnlineCount] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    const setupPresence = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create a channel for presence tracking
      channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: user?.id || `anonymous-${Math.random().toString(36).substring(7)}`,
          },
        },
      });

      // Track presence state changes
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel?.presenceState();
          if (state) {
            const count = Object.keys(state).length;
            setOnlineCount(count);
          }
        })
        .on('presence', { event: 'join' }, () => {
          const state = channel?.presenceState();
          if (state) {
            const count = Object.keys(state).length;
            setOnlineCount(count);
          }
        })
        .on('presence', { event: 'leave' }, () => {
          const state = channel?.presenceState();
          if (state) {
            const count = Object.keys(state).length;
            setOnlineCount(count);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track this user's presence
            await channel?.track({
              online_at: new Date().toISOString(),
            });
            setIsTracking(true);
          }
        });
    };

    setupPresence();

    return () => {
      if (channel) {
        channel.untrack();
        supabase.removeChannel(channel);
      }
      setIsTracking(false);
    };
  }, []);

  return { onlineCount, isTracking };
}
