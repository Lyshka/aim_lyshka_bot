import WebApp from '@twa-dev/sdk';

type Rgb = [number, number, number];

function parseColor(input?: string): Rgb | null {
  if (!input) {
    return null;
  }
  const value = input.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return [
      Number.parseInt(value.slice(1, 3), 16),
      Number.parseInt(value.slice(3, 5), 16),
      Number.parseInt(value.slice(5, 7), 16),
    ];
  }
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return [
      Number.parseInt(value[1] + value[1], 16),
      Number.parseInt(value[2] + value[2], 16),
      Number.parseInt(value[3] + value[3], 16),
    ];
  }
  return null;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isDarkTheme(bg?: string): boolean {
  const rgb = parseColor(bg);
  if (!rgb) {
    return false;
  }
  return luminance(rgb) < 0.45;
}

const LIGHT = {
  appBg: '#dfe6ee',
  appSurface: '#ffffff',
  appSurfaceMuted: '#c5d0dc',
  appBorder: 'rgba(15, 23, 42, 0.14)',
  text: '#0f172a',
  hint: '#5f6f82',
  button: '#1f6f5b',
  buttonText: '#ffffff',
};

const DARK = {
  appBg: '#0c1016',
  appSurface: '#171d27',
  appSurfaceMuted: '#252f3d',
  appBorder: 'rgba(255, 255, 255, 0.12)',
  text: '#e8eef5',
  hint: '#93a1b3',
  button: '#2dd4bf',
  buttonText: '#052e24',
};

export function applyAppTheme(params: { bg_color?: string } = {}) {
  const dark = isDarkTheme(params.bg_color);
  const base = dark ? DARK : LIGHT;
  const root = document.documentElement;

  root.dataset.theme = dark ? 'dark' : 'light';

  const style = root.style;
  style.setProperty('--app-bg', base.appBg);
  style.setProperty('--app-surface', base.appSurface);
  style.setProperty('--app-surface-muted', base.appSurfaceMuted);
  style.setProperty('--app-border', base.appBorder);
  style.setProperty('--app-text', base.text);
  style.setProperty('--app-hint', base.hint);

  style.setProperty('--app-danger', dark ? '#fca5a5' : '#9f1239');
  style.setProperty('--app-link', base.button);

  style.setProperty('--tg-bg', base.appBg);
  style.setProperty('--tg-secondary', base.appSurfaceMuted);
  style.setProperty('--tg-section', base.appSurface);
  style.setProperty('--tg-header', base.appBg);
  style.setProperty('--tg-text', base.text);
  style.setProperty('--tg-hint', base.hint);
  style.setProperty('--tg-link', base.button);
  style.setProperty('--tg-button', base.button);
  style.setProperty('--tg-button-text', base.buttonText);

  try {
    WebApp.setBackgroundColor?.(base.appBg as `#${string}`);
    WebApp.setHeaderColor?.(base.appBg as `#${string}`);
  } catch {
    //
  }
}

export function bindThemeChanges() {
  const handler = () => {
    applyAppTheme(WebApp.themeParams);
  };
  WebApp.onEvent?.('themeChanged', handler);
  return () => {
    WebApp.offEvent?.('themeChanged', handler);
  };
}
