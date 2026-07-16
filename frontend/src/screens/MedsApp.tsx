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
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          haptic('light');
          onBack();
        }}
        className="fixed top-3 left-4 z-20 rounded-xl px-3 py-1.5 text-xs font-medium"
        style={{
          background: 'color-mix(in srgb, var(--tg-hint) 16%, transparent)',
          top: 'calc(10px + var(--safe-top, 0px))',
        }}
      >
        Назад
      </button>
      <Shell tab={tab} onTabChange={setTab}>
        <div className="pt-8">
          {tab === 'home' ? <HomeScreen /> : null}
          {tab === 'history' ? <HistoryScreen /> : null}
          {tab === 'settings' ? <SettingsScreen /> : null}
        </div>
      </Shell>
    </div>
  );
}
