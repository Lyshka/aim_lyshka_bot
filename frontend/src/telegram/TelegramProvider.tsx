import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import WebApp from '@twa-dev/sdk';
import { api, type AppUser } from '../api/client';

type TelegramContextValue = {
  ready: boolean;
  error: string | null;
  user: AppUser | null;
  initData: string;
  isTelegram: boolean;
  haptic: (type?: 'light' | 'medium' | 'heavy') => void;
  close: () => void;
};

const TelegramContext = createContext<TelegramContextValue | null>(null);

function readInitData(): string {
  const fromSdk = WebApp.initData?.trim();
  if (fromSdk) {
    return fromSdk;
  }

  const fromWindow =
    typeof window !== 'undefined'
      ? window.Telegram?.WebApp?.initData?.trim()
      : '';
  return fromWindow || '';
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [initData, setInitData] = useState('');
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    let alive = true;

    async function boot() {
      try {
        WebApp.ready();
        WebApp.expand();
        WebApp.disableVerticalSwipes?.();
        document.documentElement.style.setProperty(
          '--tg-bg',
          WebApp.themeParams.bg_color || '#f4f6f8',
        );
        document.documentElement.style.setProperty(
          '--tg-text',
          WebApp.themeParams.text_color || '#101820',
        );
        document.documentElement.style.setProperty(
          '--tg-hint',
          WebApp.themeParams.hint_color || '#6b7785',
        );
        document.documentElement.style.setProperty(
          '--tg-button',
          WebApp.themeParams.button_color || '#1f6f5b',
        );
        document.documentElement.style.setProperty(
          '--tg-button-text',
          WebApp.themeParams.button_text_color || '#ffffff',
        );
        document.documentElement.style.setProperty(
          '--tg-secondary',
          WebApp.themeParams.secondary_bg_color || '#e8eef3',
        );
      } catch {
        //
      }

      const data = readInitData();
      const insideTelegram = Boolean(data);
      setIsTelegram(insideTelegram);
      setInitData(data);

      if (!data) {
        if (alive) {
          setError(
            'Приложение открыто не из Telegram. Нажми кнопку бота «Открыть приложение».',
          );
          setReady(true);
        }
        return;
      }

      try {
        const session = await api.auth(data);
        if (!alive) {
          return;
        }
        setUser(session.user);
        setError(null);
      } catch (err) {
        if (!alive) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : 'Не удалось авторизоваться через Telegram',
        );
      } finally {
        if (alive) {
          setReady(true);
        }
      }
    }

    void boot();

    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<TelegramContextValue>(
    () => ({
      ready,
      error,
      user,
      initData,
      isTelegram,
      haptic: (type = 'light') => {
        WebApp.HapticFeedback?.impactOccurred(type);
      },
      close: () => {
        WebApp.close();
      },
    }),
    [ready, error, user, initData, isTelegram],
  );

  return (
    <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
  );
}

export function useTelegram() {
  const ctx = useContext(TelegramContext);
  if (!ctx) {
    throw new Error('useTelegram вне провайдера');
  }
  return ctx;
}
