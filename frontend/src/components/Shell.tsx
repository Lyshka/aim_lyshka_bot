import type { ReactNode } from 'react';
import { useTelegram } from '../telegram/TelegramProvider';

type Tab = 'home' | 'history' | 'settings';

type ShellProps = {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
};

const tabs: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Сегодня' },
  { id: 'history', label: 'История' },
  { id: 'settings', label: 'Дозы' },
];

export function Shell({ tab, onTabChange, children }: ShellProps) {
  const { haptic } = useTelegram();

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
      <main className="flex-1 px-4 pt-5 pb-28">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 border-t px-3 pt-2"
        style={{
          background: 'var(--tg-secondary)',
          borderColor: 'color-mix(in srgb, var(--tg-hint) 25%, transparent)',
          paddingBottom: 'calc(10px + var(--safe-bottom))',
        }}
      >
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
          {tabs.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  haptic('light');
                  onTabChange(item.id);
                }}
                className="rounded-xl px-2 py-2.5 text-sm font-medium transition"
                style={{
                  color: active ? 'var(--tg-button-text)' : 'var(--tg-hint)',
                  background: active ? 'var(--tg-button)' : 'transparent',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
