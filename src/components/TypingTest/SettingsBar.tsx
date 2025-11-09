/**
 * SettingsBar Component
 * Displays settings buttons for the typing test
 */

import React from 'react';
import { Menu, ShoppingBag, Settings } from 'lucide-react';
import AppLink from '@/components/AppLink';

interface SettingsBarProps {
  onOpenMenu?: () => void;
}

export const SettingsBar: React.FC<SettingsBarProps> = ({ onOpenMenu }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpenMenu}
        className="p-2 text-zinc-500 hover:text-zinc-300 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105"
        title="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <AppLink
        href="/shop"
        loadingMessage="Opening the shop…"
        className="p-2 text-zinc-500 hover:text-zinc-300 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105"
        title="Shop"
      >
        <ShoppingBag className="w-5 h-5" />
      </AppLink>
      <AppLink
        href="/customize"
        loadingMessage="Loading customizer…"
        className="p-2 text-zinc-500 hover:text-zinc-300 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105"
        title="Customize"
      >
        <Settings className="w-5 h-5" />
      </AppLink>
    </div>
  );
};
