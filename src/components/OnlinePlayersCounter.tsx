'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function OnlinePlayersCounter() {
  const [onlineCount, setOnlineCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Get user ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    // Fetch active users count
    async function fetchActiveUsers() {
      try {
        const response = await fetch('/api/active-users');
        if (response.ok) {
          const data = await response.json();
          setOnlineCount(data.data.activeUsers);
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    }

    // Mark current user as active
    async function markActive() {
      try {
        // Call a simple endpoint or do it client-side won't work with Redis
        // Instead we'll track through activity
        await fetch('/api/active-users', { method: 'POST' });
      } catch (error) {
        console.error('Error marking user active:', error);
      }
    }

    // Initial fetch
    fetchActiveUsers();
    markActive();

    // Update every 30 seconds
    const interval = setInterval(() => {
      fetchActiveUsers();
      markActive();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  if (onlineCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <Users className="w-4 h-4" />
      <span>
        {onlineCount === 1 ? '1 player is' : `${onlineCount} players are`} typing
      </span>
    </div>
  );
}
