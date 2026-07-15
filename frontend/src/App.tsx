import { useState } from 'react';
import { Shell } from './components/Shell';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TelegramProvider, useTelegram } from './telegram/TelegramProvider';

type Tab = 'home' | 'history' | 'settings';

function AppContent() {
  const { ready, error, user } = useTelegram();
  const [tab, setTab] = useState<Tab>('home');

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
          Открой приложение только через кнопку бота в Telegram. Чужим ID вход
          закрыт.
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

  return (
    <Shell tab={tab} onTabChange={setTab}>
      {tab === 'home' ? <HomeScreen /> : null}
      {tab === 'history' ? <HistoryScreen /> : null}
      {tab === 'settings' ? <SettingsScreen /> : null}
    </Shell>
  );
}

export default function App() {
  return (
    <TelegramProvider>
      <AppContent />
    </TelegramProvider>
  );
}
