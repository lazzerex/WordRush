'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

export default function OnlinePlayersCounter() {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    // Fetch active users count
    async function fetchActiveUsers() {
      try {
        const response = await fetch('/api/active-users');
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setOnlineCount(data.data.activeUsers);
          }
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    }

    // Mark current user as active
    async function markActive() {
      try {
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

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
