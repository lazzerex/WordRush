export const THEME_STORAGE_KEY = 'wordrush.theme-preference';

const DEFAULT_THEME_VARIABLES: Record<string, string> = {
  '--color-bg-primary': '#1a1a1d',
  '--color-bg-secondary': '#232327',
  '--color-bg-tertiary': '#2d2d31',
  '--color-text-primary': '#d5d5d8',
  '--color-text-secondary': '#a1a1aa',
  '--color-text-tertiary': '#717179',
  '--color-accent-primary': '#e5a345',
  '--color-accent-secondary': '#cb913c',
};

export interface StoredThemePreference {
  themeId: string;
  cssVariables: Record<string, string>;
  themeName?: string;
  updatedAt: string;
}

const isBrowser = typeof window !== 'undefined';

export const applyThemeVariables = (cssVariables?: Record<string, string> | null) => {
  if (!isBrowser) {
    return;
  }

  const root = document.documentElement;

  Object.entries(DEFAULT_THEME_VARIABLES).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  if (!cssVariables) {
    return;
  }

  Object.entries(cssVariables).forEach(([key, value]) => {
    if (typeof value === 'string') {
      root.style.setProperty(key, value);
    }
  });
};

export const getStoredThemePreference = (): StoredThemePreference | null => {
  if (!isBrowser) {
    return null;
  }

  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredThemePreference;
    if (parsed && parsed.themeId && parsed.cssVariables) {
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to parse stored theme preference:', error);
  }

  return null;
};

export const storeThemePreference = (preference: StoredThemePreference) => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preference));
  } catch (error) {
    console.warn('Failed to persist theme preference:', error);
  }
};

export const clearThemePreference = () => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.removeItem(THEME_STORAGE_KEY);
};

export const getDefaultThemeVariables = () => ({ ...DEFAULT_THEME_VARIABLES });
