import { useState } from 'react';
import type { PlatformApp } from './api/client';
import {
  AppBackground,
  type AppBackgroundVariant,
} from './components/AppBackground';
import { AdminScreen } from './screens/AdminScreen';
import { CatsApp } from './screens/CatsApp';
import { HealthApp } from './screens/HealthApp';
import { LauncherScreen } from './screens/LauncherScreen';
import { MedsApp } from './screens/MedsApp';
import { TelegramProvider, useTelegram } from './telegram/TelegramProvider';

function backgroundVariant(app: PlatformApp | null): AppBackgroundVariant {
  if (!app) {
    return 'launcher';
  }
  if (app.slug === 'meds') {
    return 'meds';
  }
  if (app.slug === 'health') {
    return 'health';
  }
  if (app.slug === 'cats') {
    return 'cats';
  }
  if (app.slug === 'admin') {
    return 'admin';
  }
  return 'launcher';
}

function AppContent() {
  const { ready, error, user } = useTelegram();
  const [activeApp, setActiveApp] = useState<PlatformApp | null>(null);
  const variant = backgroundVariant(activeApp);

  if (!ready) {
    return (
      <>
        <AppBackground variant="launcher" />
        <div
          className="relative z-[1] flex min-h-[100dvh] items-center justify-center px-6 text-sm"
          style={{ color: 'var(--tg-hint)' }}
        >
          Загрузка...
        </div>
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <AppBackground variant="launcher" />
        <div className="relative z-[1] mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-3 px-6">
          <h1 className="font-display text-2xl font-semibold">Нет доступа</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--tg-hint)' }}>
            Открой lyshka-service через кнопку бота в Telegram.
          </p>
          <p
            className="rounded-2xl px-4 py-3 text-sm"
            style={{ background: 'var(--tg-secondary)' }}
          >
            {error ?? 'Нет данных пользователя'}
          </p>
        </div>
      </>
    );
  }

  let screen = <LauncherScreen onOpen={setActiveApp} />;

  if (activeApp?.slug === 'admin') {
    screen = <AdminScreen onBack={() => setActiveApp(null)} />;
  } else if (activeApp?.slug === 'meds') {
    screen = <MedsApp onBack={() => setActiveApp(null)} />;
  } else if (activeApp?.slug === 'cats') {
    screen = <CatsApp onBack={() => setActiveApp(null)} />;
  } else if (activeApp?.slug === 'health') {
    screen = <HealthApp onBack={() => setActiveApp(null)} />;
  }

  return (
    <>
      <AppBackground variant={variant} />
      <div className="relative z-[1]">{screen}</div>
    </>
  );
}

export default function App() {
  return (
    <TelegramProvider>
      <AppContent />
    </TelegramProvider>
  );
}
