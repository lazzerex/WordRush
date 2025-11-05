export const COINS_EVENT = 'wrcoins:update';
export const THEME_EVENT = 'wrtheme:update';
export const LOADING_EVENT = 'wrloading:update';

export interface CoinsEventDetail {
  coins: number;
}

export interface ThemeEventDetail {
  themeId: string;
  cssVariables: Record<string, string>;
  themeName?: string;
}

export interface LoadingEventDetail {
  active: boolean;
  message?: string;
}

export const broadcastCoinsEvent = (coins: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  const emit = () => {
    window.dispatchEvent(new CustomEvent<CoinsEventDetail>(COINS_EVENT, {
      detail: { coins },
    }));
  };

  if (typeof queueMicrotask === 'function') {
    queueMicrotask(emit);
  } else {
    setTimeout(emit, 0);
  }
};

export const broadcastThemeEvent = (detail: ThemeEventDetail) => {
  if (typeof window === 'undefined') {
    return;
  }

  const emit = () => {
    window.dispatchEvent(new CustomEvent<ThemeEventDetail>(THEME_EVENT, {
      detail,
    }));
  };

  if (typeof queueMicrotask === 'function') {
    queueMicrotask(emit);
  } else {
    setTimeout(emit, 0);
  }
};

export const broadcastLoadingEvent = (detail: LoadingEventDetail) => {
  if (typeof window === 'undefined') {
    return;
  }

  const emit = () => {
    window.dispatchEvent(new CustomEvent<LoadingEventDetail>(LOADING_EVENT, {
      detail,
    }));
  };

  if (typeof queueMicrotask === 'function') {
    queueMicrotask(emit);
  } else {
    setTimeout(emit, 0);
  }
};
