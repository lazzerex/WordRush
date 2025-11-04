'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  applyThemeVariables,
  getStoredThemePreference,
  storeThemePreference,
  clearThemePreference,
} from '@/lib/theme';
import { THEME_EVENT, ThemeEventDetail } from '@/lib/ui-events';

const ThemeInitializer = () => {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const applyAndPersistTheme = (detail: { themeId: string; cssVariables: Record<string, string>; themeName?: string }) => {
      applyThemeVariables(detail.cssVariables);
      storeThemePreference({
        themeId: detail.themeId,
        cssVariables: detail.cssVariables,
        themeName: detail.themeName,
        updatedAt: new Date().toISOString(),
      });
    };

    const loadInitialTheme = async () => {
      const stored = getStoredThemePreference();
      if (stored) {
        applyThemeVariables(stored.cssVariables);
      } else {
        applyThemeVariables(null);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!user) {
          clearThemePreference();
        }
        return;
      }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('active_theme_id')
        .eq('user_id', user.id)
        .single();

      if (!settings?.active_theme_id || cancelled) {
        if (!settings?.active_theme_id) {
          clearThemePreference();
        }
        return;
      }

      const { data: theme } = await supabase
        .from('themes')
        .select('id, display_name, css_variables')
        .eq('id', settings.active_theme_id)
        .single();

      if (!theme || cancelled) {
        return;
      }

      applyAndPersistTheme({
        themeId: theme.id,
        cssVariables: theme.css_variables || {},
        themeName: theme.display_name,
      });
    };

    const handleThemeEvent = (event: Event) => {
      const detail = (event as CustomEvent<ThemeEventDetail>).detail;
      if (!detail) {
        return;
      }
      applyAndPersistTheme({
        themeId: detail.themeId,
        cssVariables: detail.cssVariables,
        themeName: detail.themeName,
      });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        clearThemePreference();
        applyThemeVariables(null);
      } else {
        loadInitialTheme();
      }
    });

    window.addEventListener(THEME_EVENT, handleThemeEvent as EventListener);
    loadInitialTheme();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener(THEME_EVENT, handleThemeEvent as EventListener);
    };
  }, []);

  return null;
};

export default ThemeInitializer;
