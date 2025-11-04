'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/components/Navigation';
import { Palette, Lock, Check, Settings } from 'lucide-react';
import type { Theme } from '@/types/database';
import { applyThemeVariables, storeThemePreference } from '@/lib/theme';
import { broadcastThemeEvent } from '@/lib/ui-events';

interface ThemeWithOwnership extends Theme {
  owned: boolean;
}

export default function CustomizeClient() {
  const [themes, setThemes] = useState<ThemeWithOwnership[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadCustomizeData();
  }, []);

  const loadCustomizeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's active theme
      const { data: settings } = await supabase
        .from('user_settings')
        .select('active_theme_id')
        .eq('user_id', user.id)
        .single();

      setActiveThemeId(settings?.active_theme_id || null);

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

      if (settings?.active_theme_id) {
        const activeTheme = themesWithOwnership.find(t => t.id === settings.active_theme_id);
        if (activeTheme) {
          applyThemeSelection(activeTheme);
        }
      }
    } catch (error) {
      console.error('Error loading customize data:', error);
      setMessage({ text: 'Failed to load themes', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const applyThemeSelection = (theme: ThemeWithOwnership) => {
    applyThemeVariables(theme.css_variables || null);
    storeThemePreference({
      themeId: theme.id,
      cssVariables: theme.css_variables || {},
      themeName: theme.display_name,
      updatedAt: new Date().toISOString(),
    });
    broadcastThemeEvent({
      themeId: theme.id,
      cssVariables: theme.css_variables || {},
      themeName: theme.display_name,
    });
  };

  const applyTheme = async (theme: ThemeWithOwnership) => {
    if (!theme.owned) {
      setMessage({ text: 'You need to buy this theme from the shop first!', type: 'error' });
      return;
    }

    setApplying(theme.id);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update or insert user settings
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          active_theme_id: theme.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Apply theme CSS variables
      applyThemeSelection(theme);

      setActiveThemeId(theme.id);
      setMessage({ text: `${theme.display_name} theme applied successfully!`, type: 'success' });
    } catch (error) {
      console.error('Error applying theme:', error);
      setMessage({ text: 'Failed to apply theme. Please try again.', type: 'error' });
    } finally {
      setApplying(null);
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
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 bg-zinc-800 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const ownedThemes = themes.filter(t => t.owned);

  return (
    <div className="min-h-screen bg-zinc-900 wr-bg-primary wr-text-primary">
      <Navigation />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-100 mb-2 flex items-center gap-3 wr-text-primary">
              <Settings className="w-8 h-8 text-yellow-500" />
              Customize
            </h1>
            <p className="text-zinc-400 wr-text-secondary">Choose your preferred theme</p>
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

          {/* Owned Themes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedThemes.map(theme => {
              const isActive = theme.id === activeThemeId;
              
              return (
                <div
                  key={theme.id}
                  className={`bg-zinc-800/50 border rounded-xl p-6 transition-all ${
                    isActive 
                      ? 'border-yellow-500 ring-2 ring-yellow-500/20 wr-surface' 
                      : 'border-zinc-700 hover:border-zinc-600 wr-surface'
                  }`}
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
                    {isActive && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-zinc-900 p-1.5 rounded-full">
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

                  {/* Apply Button */}
                  {isActive ? (
                    <button
                      disabled
                      className="w-full py-3 bg-yellow-500/20 text-yellow-400 rounded-lg font-medium flex items-center justify-center gap-2 cursor-default"
                    >
                      <Check className="w-5 h-5" />
                      Active
                    </button>
                  ) : (
                    <button
                      onClick={() => applyTheme(theme)}
                      disabled={applying === theme.id}
                      className="w-full py-3 bg-zinc-700 text-zinc-200 hover:bg-zinc-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-all wr-surface"
                    >
                      {applying === theme.id ? (
                        <span className="animate-pulse">Applying...</span>
                      ) : (
                        <>
                          <Palette className="w-5 h-5" />
                          Apply Theme
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Locked Themes Section */}
          {themes.filter(t => !t.owned).length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-zinc-100 mb-4 flex items-center gap-2 wr-text-primary">
                <Lock className="w-6 h-6 text-zinc-500" />
                Locked Themes
              </h2>
              <p className="text-zinc-400 mb-6 wr-text-secondary">
                Visit the <a href="/shop" className="text-yellow-500 hover:underline">WordRush Shop</a> to purchase these themes
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {themes.filter(t => !t.owned).map(theme => (
                  <div
                    key={theme.id}
                    className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-6 opacity-60 wr-surface-muted"
                  >
                    {/* Theme Preview */}
                    <div 
                      className="h-32 rounded-lg mb-4 p-4 flex items-center justify-center relative overflow-hidden"
                      style={{ 
                        background: theme.preview_colors.background,
                        color: theme.preview_colors.text,
                        filter: 'grayscale(50%)'
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
                      <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-zinc-400" />
                      </div>
                    </div>

                    {/* Theme Info */}
                    <h3 className="text-xl font-bold text-zinc-400 mb-2 wr-text-secondary">
                      {theme.display_name}
                    </h3>
                    <p className="text-sm text-zinc-500 mb-4 line-clamp-2 wr-text-tertiary">
                      {theme.description}
                    </p>

                    {/* Locked Button */}
                    <button
                      onClick={() => setMessage({ text: `You need to buy ${theme.display_name} from the shop first!`, type: 'error' })}
                      className="w-full py-3 bg-zinc-800/50 text-zinc-500 rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer hover:bg-zinc-800"
                    >
                      <Lock className="w-5 h-5" />
                      Locked
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {ownedThemes.length === 0 && (
            <div className="text-center py-16">
              <Palette className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 mb-4 wr-text-secondary">You don't have any themes yet!</p>
              <a 
                href="/shop" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-zinc-900 rounded-lg font-medium hover:bg-yellow-400 transition-all wr-accent-bg"
              >
                Visit Shop
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
