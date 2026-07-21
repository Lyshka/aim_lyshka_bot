import type { ReactNode } from 'react';
import { useTelegram } from '../telegram/TelegramProvider';

type ShellTab<T extends string> = {
  id: T;
  label: string;
};

type ShellProps<T extends string> = {
  tab: T;
  onTabChange: (tab: T) => void;
  children: ReactNode;
  tabs?: ShellTab<T>[];
};

const defaultTabs: ShellTab<'home' | 'history' | 'settings'>[] = [
  { id: 'home', label: 'Сегодня' },
  { id: 'history', label: 'История' },
  { id: 'settings', label: 'Дозы' },
];

export function Shell<T extends string>({
  tab,
  onTabChange,
  children,
  tabs = defaultTabs as ShellTab<T>[],
}: ShellProps<T>) {
  const { haptic } = useTelegram();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col">
      <main
        className="px-4 pt-5"
        style={{ paddingBottom: 'calc(5.5rem + var(--safe-bottom))' }}
      >
        {children}
      </main>
      <nav
        className="app-nav fixed inset-x-0 bottom-0 z-50 border-t px-3 pt-2"
        style={{
          paddingBottom: 'calc(10px + var(--safe-bottom))',
        }}
      >
        <div
          className="mx-auto grid max-w-md gap-1"
          style={{
            gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          }}
        >
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
