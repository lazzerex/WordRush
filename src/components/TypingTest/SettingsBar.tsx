/**
 * SettingsBar Component
 * Displays settings buttons for the typing test
 */

import React from 'react';
import { ShoppingBag, Settings } from 'lucide-react';
import Link from 'next/link';

export const SettingsBar: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <Link 
        href="/shop"
        className="p-2 text-zinc-500 hover:text-zinc-300 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105"
        title="Shop"
      >
        <ShoppingBag className="w-5 h-5" />
      </Link>
      <Link 
        href="/customize"
        className="p-2 text-zinc-500 hover:text-zinc-300 transition-smooth rounded-lg hover:bg-zinc-800/60 hover:scale-105"
        title="Customize"
      >
        <Settings className="w-5 h-5" />
      </Link>
    </div>
  );
};
