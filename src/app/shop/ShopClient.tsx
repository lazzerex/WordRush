'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/components/Navigation';
import { Coins, Lock, Check, ShoppingCart } from 'lucide-react';
import type { Theme } from '@/types/database';
import { broadcastCoinsEvent } from '@/lib/ui-events';

interface ThemeWithOwnership extends Theme {
  owned: boolean;
}

export default function ShopClient() {
  const [themes, setThemes] = useState<ThemeWithOwnership[]>([]);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadShopData();
  }, []);

  const loadShopData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user coins
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      setUserCoins(profile?.coins || 0);

      // Get all themes
      const { data: allThemes } = await supabase
        .from('themes')
        .select('*')
        .order('price', { ascending: true });

      // Get user's purchased themes
      const { data: userThemes } = await supabase
        .from('user_themes')
        .select('theme_id')
        .eq('user_id', user.id);

      const purchasedThemeIds = new Set(userThemes?.map(ut => ut.theme_id) || []);

      // Combine data
      const themesWithOwnership = (allThemes || []).map(theme => ({
        ...theme,
        owned: theme.is_default || purchasedThemeIds.has(theme.id)
      }));

      setThemes(themesWithOwnership);
    } catch (error) {
      console.error('Error loading shop data:', error);
      setMessage({ text: 'Failed to load shop data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const purchaseTheme = async (theme: ThemeWithOwnership) => {
    if (theme.owned) {
      setMessage({ text: 'You already own this theme!', type: 'error' });
      return;
    }

    if (userCoins < theme.price) {
      setMessage({ text: 'Not enough WRCoins!', type: 'error' });
      return;
    }

    setPurchasing(theme.id);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Start a transaction-like operation
      // 1. Deduct coins
      const { error: coinsError } = await supabase.rpc('add_coins', {
        user_uuid: user.id,
        amount: -theme.price
      });

      if (coinsError) throw coinsError;

      // 2. Add theme to user_themes
      const { error: themeError } = await supabase
        .from('user_themes')
        .insert({
          user_id: user.id,
          theme_id: theme.id
        });

      if (themeError) throw themeError;

      // Update local state
      setUserCoins(prev => {
        const updated = Math.max(0, prev - theme.price);
        broadcastCoinsEvent(updated);
        return updated;
      });
      setThemes(prev => prev.map(t => 
        t.id === theme.id ? { ...t, owned: true } : t
      ));

      setMessage({ text: `Successfully purchased ${theme.display_name}!`, type: 'success' });
    } catch (error) {
      console.error('Error purchasing theme:', error);
      setMessage({ text: 'Failed to purchase theme. Please try again.', type: 'error' });
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 wr-bg-primary wr-text-primary">
        <Navigation />
        <main className="pt-24 pb-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-10 w-48 bg-zinc-800 rounded mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-64 bg-zinc-800 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 wr-bg-primary wr-text-primary">
      <Navigation />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 mb-2 flex items-center gap-3 wr-text-primary">
                <ShoppingCart className="w-8 h-8 text-yellow-500" />
                WordRush Shop
              </h1>
              <p className="text-zinc-400 wr-text-secondary">Purchase themes to customize your typing experience</p>
            </div>
            <div className="flex items-center gap-2 px-6 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl wr-border">
              <Coins className="w-6 h-6 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-500">{userCoins}</span>
              <span className="text-sm text-zinc-400">WRCoins</span>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          {/* Themes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {themes.map(theme => (
              <div
                key={theme.id}
                className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 hover:border-zinc-600 transition-all wr-surface"
              >
                {/* Theme Preview */}
                <div 
                  className="h-32 rounded-lg mb-4 p-4 flex items-center justify-center relative overflow-hidden"
                  style={{ 
                    background: theme.preview_colors.background,
                    color: theme.preview_colors.text
                  }}
                >
                  <div className="text-center space-y-2">
                    <div className="font-mono text-lg opacity-60">the quick brown</div>
                    <div 
                      className="font-mono text-xl font-bold"
                      style={{ color: theme.preview_colors.accent }}
                    >
                      fox jumps
                    </div>
                  </div>
                  {theme.owned && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1.5 rounded-full">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Theme Info */}
                <h3 className="text-xl font-bold text-zinc-100 mb-2 wr-text-primary">
                  {theme.display_name}
                </h3>
                <p className="text-sm text-zinc-400 mb-4 line-clamp-2 wr-text-secondary">
                  {theme.description}
                </p>

                {/* Purchase Button */}
                {theme.owned ? (
                  <button
                    disabled
                    className="w-full py-3 bg-green-500/20 text-green-400 rounded-lg font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <Check className="w-5 h-5" />
                    Owned
                  </button>
                ) : (
                  <button
                    onClick={() => purchaseTheme(theme)}
                    disabled={purchasing === theme.id || userCoins < theme.price}
                    className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                      userCoins < theme.price
                        ? 'bg-zinc-700/50 text-zinc-500 cursor-not-allowed'
                        : 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400 wr-accent-bg'
                    }`}
                  >
                    {purchasing === theme.id ? (
                      <span className="animate-pulse">Purchasing...</span>
                    ) : userCoins < theme.price ? (
                      <>
                        <Lock className="w-5 h-5" />
                        {theme.price} WRCoins
                      </>
                    ) : (
                      <>
                        <Coins className="w-5 h-5" />
                        {theme.price} WRCoins
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {themes.length === 0 && (
            <div className="text-center py-16">
              <ShoppingCart className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 wr-text-secondary">No themes available yet. Check back later!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
