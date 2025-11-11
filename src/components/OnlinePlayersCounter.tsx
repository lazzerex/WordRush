'use client';

import { Users } from 'lucide-react';
import { useOnlineUsers } from '@/hooks';

export default function OnlinePlayersCounter() {
  const { onlineCount, isTracking } = useOnlineUsers();

  if (!isTracking || onlineCount === 0) {
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
