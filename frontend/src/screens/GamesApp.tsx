import { useCallback, useEffect, useState } from 'react';
import { api, type GamesOverview, type SteamGame } from '../api/client';
import { Shell } from '../components/Shell';
import { useTelegram } from '../telegram/TelegramProvider';

type GamesAppProps = {
  onBack: () => void;
};

type Tab = 'home' | 'owned' | 'missing';

const gamesTabs = [
  { id: 'home' as const, label: 'Обзор' },
  { id: 'owned' as const, label: 'Есть' },
  { id: 'missing' as const, label: 'Нет' },
];

function formatSync(value: string | null | undefined) {
  if (!value) {
    return 'ещё не синхронизировали';
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function GamesApp({ onBack }: GamesAppProps) {
  const { initData, haptic } = useTelegram();
  const [data, setData] = useState<GamesOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [steamInput, setSteamInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const overview = await api.gamesOverview(initData);
    setData(overview);
    return overview;
  }, [initData]);

  useEffect(() => {
    let alive = true;
    load().catch((err: Error) => {
      if (alive) {
        setError(err.message);
      }
    });
    return () => {
      alive = false;
    };
  }, [load]);

  async function linkSteam() {
    if (!steamInput.trim()) {
      setStatus('Вставь ссылку или ник Steam');
      return;
    }
    setBusy(true);
    setStatus(null);
    haptic('medium');
    try {
      const overview = await api.gamesLink(initData, steamInput.trim());
      setData(overview);
      setStatus('Steam привязан, wishlist загружен');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка привязки');
    } finally {
      setBusy(false);
    }
  }

  async function syncSteam() {
    setBusy(true);
    setStatus(null);
    haptic('medium');
    try {
      const overview = await api.gamesSync(initData);
      setData(overview);
      setStatus('Список обновлён');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка синхронизации');
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-md px-4 pt-5">
        <button type="button" onClick={onBack} className="mb-4 text-sm">
          ← Назад
        </button>
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="flex min-h-[50dvh] items-center justify-center text-sm"
        style={{ color: 'var(--tg-hint)' }}
      >
        Загрузка...
      </div>
    );
  }

  const list =
    tab === 'owned' ? data.owned : tab === 'missing' ? data.missing : [];

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="px-4 pt-5">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            onBack();
          }}
          className="rounded-2xl px-3 py-2 text-sm font-medium"
          style={{
            background: 'color-mix(in srgb, white 50%, #66c0f4)',
          }}
        >
          ← Назад
        </button>

        <div className="mt-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Игры
          </h1>
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            Steam wishlist и библиотека — что есть и чего нет
          </p>
        </div>
      </div>

      <Shell tab={tab} onTabChange={setTab} tabs={gamesTabs}>
        {tab === 'home' ? (
          <div className="space-y-4">
            {!data.steamConfigured ? (
              <section
                className="rounded-3xl px-5 py-4 text-sm"
                style={{
                  background: 'color-mix(in srgb, #b42318 12%, var(--tg-secondary))',
                  color: '#9f1239',
                }}
              >
                На сервере не задан STEAM_API_KEY. Админ должен добавить ключ в .env
                и перезапустить backend.
              </section>
            ) : null}

            {!data.profile ? (
              <section
                className="space-y-3 rounded-3xl px-5 py-4"
                style={{
                  background: 'color-mix(in srgb, white 70%, #1b2838)',
                }}
              >
                <p className="text-sm font-medium">Привязка Steam</p>
                <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                  Вставь ссылку на профиль, Steam ID (7656...) или custom URL (ник).
                </p>
                <input
                  value={steamInput}
                  onChange={(e) => setSteamInput(e.target.value)}
                  placeholder="https://steamcommunity.com/id/ник"
                  className="w-full rounded-xl border-0 px-3 py-2.5 outline-none"
                  style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void linkSteam()}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(145deg, #1b2838, #2a475e)',
                    color: '#c7d5e0',
                  }}
                >
                  Привязать и загрузить wishlist
                </button>
              </section>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Всего" value={data.stats.total} />
                  <StatCard label="Есть" value={data.stats.owned} accent="#16a34a" />
                  <StatCard label="Нет" value={data.stats.missing} accent="#dc2626" />
                </div>

                <section
                  className="space-y-3 rounded-3xl px-5 py-4"
                  style={{
                    background: 'color-mix(in srgb, white 70%, #1b2838)',
                  }}
                >
                  <p className="text-sm font-medium">Steam профиль</p>
                  <p className="text-sm break-all" style={{ color: 'var(--tg-hint)' }}>
                    {data.profile.profileUrl}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                    Обновлено: {formatSync(data.profile.lastSyncAt)}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void syncSteam()}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(145deg, #1b2838, #2a475e)',
                      color: '#c7d5e0',
                    }}
                  >
                    Обновить из Steam
                  </button>
                </section>

                <section
                  className="rounded-3xl px-5 py-4 text-sm"
                  style={{ background: 'var(--tg-secondary)' }}
                >
                  <p className="font-medium">Публичность в Steam</p>
                  <ul className="mt-2 space-y-1" style={{ color: 'var(--tg-hint)' }}>
                    <li>• Профиль — публичный</li>
                    <li>• Список желаемого — виден всем</li>
                    <li>• Список игр (библиотека) — публичный, иначе «Есть» будет пустым</li>
                  </ul>
                </section>
              </>
            )}
          </div>
        ) : null}

        {tab === 'owned' || tab === 'missing' ? (
          <div className="space-y-3">
            {list.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                {data.profile
                  ? tab === 'owned'
                    ? 'В библиотеке пока пусто или список игр скрыт в Steam'
                    : 'Wishlist пуст — все желаемые игры уже куплены или список пустой'
                  : 'Сначала привяжи Steam на вкладке «Обзор»'}
              </p>
            ) : (
              list.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  variant={tab === 'owned' ? 'owned' : 'missing'}
                />
              ))
            )}
          </div>
        ) : null}

        {status ? (
          <p
            className="rounded-2xl px-4 py-3 text-sm"
            style={{
              background: 'color-mix(in srgb, var(--tg-button) 14%, transparent)',
            }}
          >
            {status}
          </p>
        ) : null}
      </Shell>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div
      className="rounded-[24px] px-3 py-4 text-center"
      style={{
        background: 'color-mix(in srgb, white 72%, #66c0f4)',
      }}
    >
      <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--tg-hint)' }}>
        {label}
      </p>
      <p
        className="font-display mt-2 text-2xl font-semibold"
        style={{ color: accent ?? 'var(--tg-text)' }}
      >
        {value}
      </p>
    </div>
  );
}

function SteamCover({ src }: { src?: string }) {
  const [broken, setBroken] = useState(!src);

  return (
    <div
      className="relative h-[52px] w-[116px] shrink-0 overflow-hidden rounded-[14px]"
      style={{
        background: 'linear-gradient(145deg, #1b2838, #2a475e)',
      }}
    >
      {!broken && src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            aria-hidden
            fill="#c7d5e0"
          >
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.962 20.307 6.59 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714 1.001 1.28 1.28 1.274.629 2.816.004 3.447-1.271.306-.617.314-1.318.047-1.942-.267-.625-.748-1.122-1.36-1.403-.612-.282-1.308-.295-1.942-.047l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.01L7.54 18.21zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.289-.005c0-1.252 1.02-2.274 2.274-2.274 1.251 0 2.274 1.022 2.274 2.274 0 1.251-1.023 2.274-2.274 2.274-1.254 0-2.274-1.023-2.274-2.274z" />
          </svg>
        </div>
      )}
    </div>
  );
}

function GameCard({
  game,
  variant,
}: {
  game: SteamGame;
  variant: 'owned' | 'missing';
}) {
  return (
    <a
      href={game.storeUrl}
      target="_blank"
      rel="noreferrer"
      className="flex gap-3 overflow-hidden rounded-[24px] p-2 pr-3"
      style={{
        background: 'color-mix(in srgb, white 75%, #1b2838)',
      }}
    >
      <SteamCover src={game.imageUrl || undefined} />
      <div className="min-w-0 py-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{game.name}</p>
        <p
          className="mt-1 text-xs font-medium"
          style={{ color: variant === 'owned' ? '#16a34a' : '#dc2626' }}
        >
          {variant === 'owned' ? 'В библиотеке' : 'Ещё нет'}
        </p>
      </div>
    </a>
  );
}
