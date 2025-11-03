/**
 * SettingsBar Component
 * Displays settings buttons for the typing test
 */

import React from 'react';
import { Settings, Keyboard } from 'lucide-react';

export const SettingsBar: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105">
        <Settings className="w-5 h-5" />
      </button>
      <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105">
        <Keyboard className="w-5 h-5" />
      </button>
    </div>
  );
};
