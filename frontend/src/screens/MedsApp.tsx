import { useState } from 'react';
import { Shell } from '../components/Shell';
import { HistoryScreen } from './HistoryScreen';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';
import { useTelegram } from '../telegram/TelegramProvider';

type Tab = 'home' | 'history' | 'settings';

type MedsAppProps = {
  onBack: () => void;
};

export function MedsApp({ onBack }: MedsAppProps) {
  const { haptic } = useTelegram();
  const [tab, setTab] = useState<Tab>('home');

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            onBack();
          }}
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={{
            background: 'color-mix(in srgb, var(--tg-hint) 16%, transparent)',
          }}
        >
          ← К приложениям
        </button>
      </div>
      <Shell tab={tab} onTabChange={setTab}>
        {tab === 'home' ? <HomeScreen /> : null}
        {tab === 'history' ? <HistoryScreen /> : null}
        {tab === 'settings' ? <SettingsScreen /> : null}
      </Shell>
    </div>
  );
}
