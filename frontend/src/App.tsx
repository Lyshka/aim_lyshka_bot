import { useState } from 'react';
import type { PlatformApp } from './api/client';
import { AdminScreen } from './screens/AdminScreen';
import { CatsApp } from './screens/CatsApp';
import { HealthApp } from './screens/HealthApp';
import { LauncherScreen } from './screens/LauncherScreen';
import { MedsApp } from './screens/MedsApp';
import { TelegramProvider, useTelegram } from './telegram/TelegramProvider';

function AppContent() {
  const { ready, error, user } = useTelegram();
  const [activeApp, setActiveApp] = useState<PlatformApp | null>(null);

  if (!ready) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center px-6 text-sm"
        style={{ color: 'var(--tg-hint)' }}
      >
        Загрузка...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-3 px-6">
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
    );
  }

  if (activeApp?.slug === 'admin') {
    return <AdminScreen onBack={() => setActiveApp(null)} />;
  }

  if (activeApp?.slug === 'meds') {
    return <MedsApp onBack={() => setActiveApp(null)} />;
  }

  if (activeApp?.slug === 'cats') {
    return <CatsApp onBack={() => setActiveApp(null)} />;
  }

  if (activeApp?.slug === 'health') {
    return <HealthApp onBack={() => setActiveApp(null)} />;
  }

  return <LauncherScreen onOpen={setActiveApp} />;
}

export default function App() {
  return (
    <TelegramProvider>
      <AppContent />
    </TelegramProvider>
  );
}
