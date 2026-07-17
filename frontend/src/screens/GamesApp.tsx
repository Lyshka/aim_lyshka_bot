import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type GamesOverview,
  type InventoryItem,
  type InventoryOverview,
  type SteamGame,
  type SteamProfile,
} from '../api/client';
import { Shell } from '../components/Shell';
import { useTelegram } from '../telegram/TelegramProvider';

type GamesAppProps = {
  onBack: () => void;
};

type Tab = 'home' | 'owned' | 'missing' | 'inventory';

const gamesTabs = [
  { id: 'home' as const, label: 'Обзор' },
  { id: 'owned' as const, label: 'Есть' },
  { id: 'missing' as const, label: 'Нет' },
  { id: 'inventory' as const, label: 'Скины' },
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

function formatUsd(value: number | null | undefined) {
  if (value == null) {
    return '—';
  }
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function GamesApp({ onBack }: GamesAppProps) {
  const { initData, haptic } = useTelegram();
  const [data, setData] = useState<GamesOverview | null>(null);
  const [inventory, setInventory] = useState<InventoryOverview | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [steamInput, setSteamInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const overview = await api.gamesOverview(initData);
    setData(overview);
    setAdding(overview.profiles.length === 0);
    return overview;
  }, [initData]);

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const next = await api.gamesInventory(initData);
      setInventory(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка инвентаря');
    } finally {
      setInventoryLoading(false);
    }
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

  useEffect(() => {
    if (tab !== 'inventory') {
      return;
    }
    void loadInventory();
  }, [tab, loadInventory, data?.profile?.id]);

  async function linkSteam() {
    if (!steamInput.trim()) {
      setStatus('Вставь ссылку или ник Steam');
      return;
    }
    setBusy(true);
    setStatus('Добавляем аккаунт и синхронизируем…');
    haptic('medium');
    try {
      const overview = await api.gamesLink(initData, steamInput.trim());
      setData(overview);
      setInventory(null);
      setSteamInput('');
      setAdding(false);
      setStatus(
        `Синхронизировано: есть ${overview.stats.owned}, нет ${overview.stats.missing}`,
      );
    } catch (err) {
      try {
        const overview = await api.gamesOverview(initData);
        setData(overview);
        setAdding(overview.profiles.length === 0);
        if (overview.profiles.length > 0) {
          setSteamInput('');
        }
      } catch {
        //
      }
      setStatus(err instanceof Error ? err.message : 'Ошибка привязки');
    } finally {
      setBusy(false);
    }
  }

  async function selectAccount(profileId: string) {
    setBusy(true);
    setStatus(null);
    haptic('light');
    try {
      const overview = await api.gamesSelect(initData, profileId);
      setData(overview);
      setInventory(null);
      if (tab === 'inventory') {
        void loadInventory();
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка выбора');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(profileId: string) {
    setBusy(true);
    setStatus(null);
    haptic('heavy');
    try {
      const overview = await api.gamesDelete(initData, profileId);
      setData(overview);
      setInventory(null);
      setAdding(overview.profiles.length === 0);
      setStatus('Аккаунт удалён');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка удаления');
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
  const hasAccounts = data.profiles.length > 0;

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

            {hasAccounts ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Всего" value={data.stats.total} />
                  <StatCard label="Есть" value={data.stats.owned} accent="#16a34a" />
                  <StatCard label="Нет" value={data.stats.missing} accent="#dc2626" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    label="Скины"
                    value={data.stats.inventoryCount}
                    accent="#2a475e"
                  />
                  <StatCard
                    label="Инвентарь"
                    value={formatUsd(data.stats.inventoryValueUsd)}
                    accent="#1b2838"
                  />
                </div>
                <p className="px-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
                  Сумма по всем аккаунтам · CS2
                </p>

                <section className="space-y-2">
                  <p className="px-1 text-sm font-medium">Аккаунты Steam</p>
                  {data.profiles.map((profile) => (
                    <AccountCard
                      key={profile.id}
                      profile={profile}
                      busy={busy}
                      onSelect={() => void selectAccount(profile.id)}
                      onDelete={() => void deleteAccount(profile.id)}
                    />
                  ))}
                </section>

                {!adding ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setAdding(true);
                      setStatus(null);
                    }}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
                    style={{
                      background: 'color-mix(in srgb, var(--tg-hint) 14%, transparent)',
                    }}
                  >
                    Добавить аккаунт
                  </button>
                ) : null}
              </>
            ) : null}

            {adding || !hasAccounts ? (
              <section
                className="space-y-3 rounded-3xl px-5 py-4"
                style={{
                  background: 'color-mix(in srgb, white 70%, #1b2838)',
                }}
              >
                <p className="text-sm font-medium">
                  {hasAccounts ? 'Новый Steam аккаунт' : 'Привязка Steam'}
                </p>
                <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                  Вставь ссылку на профиль, Steam ID или ник. После добавления ссылку
                  изменить нельзя — только удалить аккаунт.
                </p>
                <input
                  value={steamInput}
                  onChange={(e) => setSteamInput(e.target.value)}
                  placeholder="https://steamcommunity.com/id/ник"
                  className="w-full rounded-xl border-0 px-3 py-2.5 outline-none"
                  style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void linkSteam()}
                    className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(145deg, #1b2838, #2a475e)',
                      color: '#c7d5e0',
                    }}
                  >
                    Добавить
                  </button>
                  {hasAccounts ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setAdding(false);
                        setSteamInput('');
                      }}
                      className="rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
                      style={{
                        background: 'color-mix(in srgb, var(--tg-hint) 14%, transparent)',
                      }}
                    >
                      Отмена
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            {data.profile ? (
              <p className="text-center text-xs" style={{ color: 'var(--tg-hint)' }}>
                Данные обновляются автоматически раз в день ·{' '}
                {formatSync(data.profile.lastSyncAt)}
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === 'owned' || tab === 'missing' ? (
          <div className="space-y-3">
            {data.profile ? (
              <div
                className="flex items-center gap-3 rounded-2xl px-3 py-2"
                style={{
                  background: 'color-mix(in srgb, white 70%, #1b2838)',
                }}
              >
                <AccountAvatar profile={data.profile} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {data.profile.personaName}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                    {tab === 'owned' ? 'Библиотека' : 'Wishlist'}
                  </p>
                </div>
                <ProfileLinkButton href={data.profile.profileUrl} />
              </div>
            ) : null}

            {list.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                {data.profile
                  ? tab === 'owned'
                    ? 'В библиотеке пока пусто или список игр скрыт в Steam'
                    : 'Wishlist пуст'
                  : 'Сначала добавь Steam аккаунт на вкладке «Обзор»'}
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

        {tab === 'inventory' ? (
          <div className="space-y-3">
            {data.profile ? (
              <div
                className="flex items-center gap-3 rounded-2xl px-3 py-2"
                style={{
                  background: 'color-mix(in srgb, white 70%, #1b2838)',
                }}
              >
                <AccountAvatar profile={data.profile} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {data.profile.personaName}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                    CS2 · {formatSync(inventory?.profile?.lastInventorySyncAt)}
                  </p>
                </div>
                <ProfileLinkButton href={data.profile.profileUrl} />
              </div>
            ) : null}

            {!data.profile ? (
              <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                Сначала добавь Steam аккаунт на вкладке «Обзор»
              </p>
            ) : inventoryLoading && !inventory ? (
              <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                Загружаем инвентарь и цены…
              </p>
            ) : inventory?.hidden ? (
              <section
                className="rounded-3xl px-5 py-4 text-sm"
                style={{
                  background: 'color-mix(in srgb, #b42318 12%, var(--tg-secondary))',
                  color: '#9f1239',
                }}
              >
                Инвентарь скрыт в настройках Steam. Сделай профиль и инвентарь CS2
                публичными, затем открой вкладку снова.
              </section>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    label="Предметов"
                    value={inventory?.itemsCount ?? 0}
                  />
                  <StatCard
                    label="Сумма"
                    value={formatUsd(inventory?.totalValueUsd ?? 0)}
                    accent="#1b2838"
                  />
                </div>
                {(inventory?.items.length ?? 0) === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                    Инвентарь CS2 пуст или ещё не загрузился
                  </p>
                ) : (
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(108px, 1fr))',
                    }}
                  >
                    {inventory?.items.map((item) => (
                      <InventoryCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </>
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

function AccountAvatar({ profile }: { profile: SteamProfile }) {
  const [broken, setBroken] = useState(!profile.avatarUrl);
  return broken ? (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{ background: '#1b2838', color: '#66c0f4' }}
    >
      {(profile.personaName || 'S').slice(0, 1).toUpperCase()}
    </div>
  ) : (
    <img
      src={profile.avatarUrl}
      alt=""
      className="h-11 w-11 shrink-0 rounded-full object-cover"
      onError={() => setBroken(true)}
    />
  );
}

function ProfileLinkButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Открыть профиль Steam"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{
        background: 'color-mix(in srgb, #1b2838 88%, #66c0f4)',
        color: '#c7d5e0',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z" />
      </svg>
    </a>
  );
}

function AccountCard({
  profile,
  busy,
  onSelect,
  onDelete,
}: {
  profile: SteamProfile;
  busy: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className="rounded-[24px] px-3 py-3"
      style={{
        background: profile.active
          ? 'color-mix(in srgb, #66c0f4 22%, white)'
          : 'color-mix(in srgb, white 70%, #1b2838)',
        outline: profile.active ? '2px solid #66c0f4' : 'none',
      }}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          disabled={busy || profile.active}
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-100"
        >
          <AccountAvatar profile={profile} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile.personaName}</p>
            <p className="truncate text-xs" style={{ color: 'var(--tg-hint)' }}>
              {profile.active ? 'Выбран' : 'Нажми, чтобы выбрать'} ·{' '}
              {formatSync(profile.lastSyncAt)}
            </p>
          </div>
        </button>
        <ProfileLinkButton href={profile.profileUrl} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Всего" value={profile.stats.total} />
        <MiniStat label="Есть" value={profile.stats.owned} accent="#16a34a" />
        <MiniStat label="Нет" value={profile.stats.missing} accent="#dc2626" />
      </div>

      <div
        className="mt-2 rounded-xl px-3 py-2"
        style={{
          background: 'color-mix(in srgb, white 55%, transparent)',
        }}
      >
        {profile.inventoryHidden ? (
          <p className="text-xs font-medium" style={{ color: '#b42318' }}>
            Инвентарь скрыт
          </p>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
              CS2 · {profile.stats.inventoryCount} шт.
            </p>
            <p className="text-sm font-semibold">{formatUsd(profile.stats.inventoryValueUsd)}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
        style={{
          background: 'color-mix(in srgb, #b42318 14%, transparent)',
          color: '#b42318',
        }}
      >
        Удалить аккаунт
      </button>
    </article>
  );
}

function MiniStat({
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
      className="rounded-xl px-2 py-2 text-center"
      style={{
        background: 'color-mix(in srgb, white 55%, transparent)',
      }}
    >
      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--tg-hint)' }}>
        {label}
      </p>
      <p
        className="mt-0.5 text-base font-semibold"
        style={{ color: accent ?? 'var(--tg-text)' }}
      >
        {value}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-[24px] px-3 py-4 text-center"
      style={{
        background: 'color-mix(in srgb, white 72%, #66c0f4)',
      }}
    >
      <p
        className="text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: 'var(--tg-hint)' }}
      >
        {label}
      </p>
      <p
        className="font-display mt-2 text-xl font-semibold leading-tight"
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

function InventoryIcon({ src }: { src: string }) {
  const [broken, setBroken] = useState(!src);
  return (
    <div
      className="mx-auto flex aspect-square w-full max-w-[88px] items-center justify-center overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(145deg, #1b2838, #2a475e)',
      }}
    >
      {!broken && src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain p-1.5"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="text-xs font-bold" style={{ color: '#66c0f4' }}>
          CS
        </span>
      )}
    </div>
  );
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const price = item.totalUsd ?? item.priceUsd;
  return (
    <article
      className="flex flex-col gap-2 overflow-hidden rounded-[20px] p-2"
      style={{
        background: 'color-mix(in srgb, white 75%, #1b2838)',
      }}
    >
      <div className="relative">
        <InventoryIcon src={item.iconUrl} />
        {item.amount > 1 ? (
          <span
            className="absolute top-1 right-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              background: 'color-mix(in srgb, #1b2838 82%, transparent)',
              color: '#c7d5e0',
            }}
          >
            ×{item.amount}
          </span>
        ) : null}
      </div>
      <p className="line-clamp-2 min-h-[2.5rem] text-center text-[11px] font-semibold leading-snug">
        {item.name}
      </p>
      <p
        className="text-center text-xs font-semibold"
        style={{ color: price != null ? 'var(--tg-text)' : 'var(--tg-hint)' }}
      >
        {formatUsd(price)}
      </p>
    </article>
  );
}
