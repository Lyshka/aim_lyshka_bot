import type { PlatformApp } from '../api/client';
import { AppIcon, appAccent } from '../components/AppIcon';
import { useTelegram } from '../telegram/TelegramProvider';

type LauncherScreenProps = {
  onOpen: (app: PlatformApp) => void;
};

export function LauncherScreen({ onOpen }: LauncherScreenProps) {
  const { user, apps, haptic } = useTelegram();

  return (
    <div className="launcher relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden px-5 pt-10 pb-12">
      <div className="launcher-orb launcher-orb-a" aria-hidden />
      <div className="launcher-orb launcher-orb-b" aria-hidden />
      <div className="launcher-grid" aria-hidden />

      <header className="relative z-10 mb-10">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase text-teal-800/80"
          style={{
            background: 'color-mix(in srgb, #0f766e 12%, transparent)',
            backdropFilter: 'blur(8px)',
          }}
        >
          lyshka-service
        </div>
        <h1 className="font-display mt-5 text-[2.35rem] leading-[1.05] font-semibold tracking-tight">
          Приложения
        </h1>
        <p className="mt-3 max-w-[18rem] text-[15px] leading-relaxed" style={{ color: 'var(--tg-hint)' }}>
          Привет, {user?.firstName ?? 'друг'}. Нажми на иконку, чтобы открыть.
        </p>
      </header>

      <div className="relative z-10 flex-1">
        {apps.length === 0 ? (
          <div
            className="rounded-[28px] border border-white/40 px-5 py-10 text-center text-sm shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
            style={{
              background: 'color-mix(in srgb, var(--tg-secondary) 70%, white)',
              color: 'var(--tg-hint)',
              backdropFilter: 'blur(12px)',
            }}
          >
            Пока нет доступных приложений.
            <br />
            Администратор выдаст доступ позже.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-7">
            {apps.map((app, index) => {
              const accent = appAccent(app.slug, app.color);
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    haptic('medium');
                    onOpen(app);
                  }}
                  className="launcher-tile group flex flex-col items-center gap-2.5 text-center"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span
                    className="launcher-icon relative flex h-[76px] w-[76px] items-center justify-center rounded-[24px] text-white transition duration-200 group-active:scale-95"
                    style={{
                      background: `linear-gradient(145deg, ${accent.from} 0%, ${accent.to} 100%)`,
                      boxShadow: `0 14px 28px ${accent.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`,
                    }}
                  >
                    <span className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/25 to-transparent opacity-80" />
                    <AppIcon slug={app.slug} className="relative h-10 w-10" />
                  </span>
                  <span className="line-clamp-2 max-w-[96px] text-[12.5px] font-semibold tracking-[-0.01em]">
                    {app.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
