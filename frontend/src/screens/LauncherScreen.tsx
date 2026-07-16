import type { PlatformApp } from '../api/client';
import { useTelegram } from '../telegram/TelegramProvider';

type LauncherScreenProps = {
  onOpen: (app: PlatformApp) => void;
};

export function LauncherScreen({ onOpen }: LauncherScreenProps) {
  const { user, apps, haptic } = useTelegram();

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pt-8 pb-10">
      <header className="mb-8">
        <p
          className="font-display text-xs tracking-[0.22em] uppercase"
          style={{ color: 'var(--tg-button)' }}
        >
          lyshka-service
        </p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
          Привет, {user?.firstName ?? 'друг'}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--tg-hint)' }}>
          Выбери приложение
        </p>
      </header>

      {apps.length === 0 ? (
        <div
          className="rounded-3xl px-5 py-8 text-center text-sm"
          style={{ background: 'var(--tg-secondary)', color: 'var(--tg-hint)' }}
        >
          Пока нет доступных приложений.
          <br />
          Администратор выдаст доступ позже.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-4 gap-y-6">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => {
                haptic('medium');
                onOpen(app);
              }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <span
                className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] text-lg font-semibold tracking-wide text-white shadow-sm"
                style={{ background: app.color }}
              >
                {app.icon}
              </span>
              <span className="line-clamp-2 max-w-[88px] text-[12px] font-medium leading-tight">
                {app.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
