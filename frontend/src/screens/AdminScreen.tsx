import { useEffect, useState } from 'react';
import {
  api,
  type AdminOverview,
  type AdminUser,
  type PlatformApp,
} from '../api/client';
import { AppIcon, appAccent } from '../components/AppIcon';
import { useTelegram } from '../telegram/TelegramProvider';

type AdminScreenProps = {
  onBack: () => void;
};

type AdminTab = 'search' | 'access';

type PendingGrantAction = {
  userId: number;
  app: PlatformApp;
  enabled: boolean;
};

const adminTabs: { id: AdminTab; label: string }[] = [
  { id: 'access', label: 'С доступом' },
  { id: 'search', label: 'Поиск' },
];

const grantPalette = {
  yes: {
    card: 'color-mix(in srgb, #16a34a 10%, white)',
    badgeBg: '#dcfce7',
    badgeText: '#15803d',
    button: 'linear-gradient(145deg, #22c55e, #16a34a)',
    buttonText: '#fff',
  },
  no: {
    card: 'var(--tg-bg)',
    badgeBg: '#fee2e2',
    badgeText: '#b42318',
    button: 'color-mix(in srgb, #b42318 14%, transparent)',
    buttonText: '#b42318',
  },
};

export function AdminScreen({ onBack }: AdminScreenProps) {
  const { initData, haptic, refreshSession } = useTelegram();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [tab, setTab] = useState<AdminTab>('access');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [searched, setSearched] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingGrantAction | null>(
    null,
  );

  const grantableApps = (data?.apps ?? []).filter((a) => !a.isSystem);

  useEffect(() => {
    let alive = true;
    api
      .adminOverview(initData)
      .then((res) => {
        if (alive) {
          setData(res);
        }
      })
      .catch((err: Error) => setStatus(err.message));
    return () => {
      alive = false;
    };
  }, [initData]);

  async function refreshSearch(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      setSearched(false);
      return [];
    }
    const result = await api.adminSearch(initData, query.trim());
    setSearchResults(result.users);
    setSearched(true);
    return result.users;
  }

  async function searchUsers() {
    const query = searchQuery.trim();
    if (!query) {
      setStatus('Введи ID или @ник');
      return;
    }

    setBusy(true);
    setStatus(null);
    haptic('light');
    try {
      const users = await refreshSearch(query);
      if (users.length === 0) {
        setStatus(
          'Никого не найдено. Пользователь должен сначала написать боту /start',
        );
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      setBusy(false);
    }
  }

  function requestGrantAction(
    userId: number,
    app: PlatformApp,
    enabled: boolean,
  ) {
    haptic('light');
    setPendingAction({ userId, app, enabled });
    setStatus(null);
  }

  async function applyGrantAction(action: PendingGrantAction) {
    setBusy(true);
    haptic('medium');
    try {
      const next = await api.setGrant(initData, {
        userId: action.userId,
        appSlug: action.app.slug,
        enabled: action.enabled,
      });
      setData(next);
      await refreshSession();
      if (searchQuery.trim()) {
        await refreshSearch(searchQuery);
      }
      setPendingAction(null);
      setStatus(action.enabled ? 'Доступ выдан' : 'Доступ снят');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col pb-24">
      <div className="px-4 pt-5">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              haptic('light');
              onBack();
            }}
            className="rounded-2xl px-3 py-2 text-sm font-medium"
            style={{
              background: 'color-mix(in srgb, white 55%, var(--tg-secondary))',
              backdropFilter: 'blur(8px)',
            }}
          >
            ← Назад
          </button>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Админка
            </h1>
            <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
              Пользователи и доступы
            </p>
          </div>
        </div>

        {tab === 'search' ? (
          <div className="space-y-4">
            <section
              className="space-y-3 rounded-[28px] px-5 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
              style={{
                background: 'color-mix(in srgb, white 70%, var(--tg-secondary))',
                backdropFilter: 'blur(10px)',
              }}
            >
              <p className="text-sm font-semibold">Поиск по ID или @нику</p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--tg-hint)' }}
              >
                Можно искать по части ID, например 80 найдёт 802429313
              </p>
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="80 или @username"
                  className="min-w-0 flex-1 rounded-2xl border-0 px-3 py-2.5 outline-none"
                  style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void searchUsers()}
                  className="rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(145deg, #0d9488, #115e59)',
                    color: '#fff',
                  }}
                >
                  Найти
                </button>
              </div>
            </section>

            {searched ? (
              <div className="space-y-3">
                {searchResults.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                    Никого не найдено
                  </p>
                ) : (
                  searchResults.map((user) => (
                    <UserGrantsCard
                      key={`search-${user.id}`}
                      user={user}
                      grantableApps={grantableApps}
                      pendingAction={pendingAction}
                      busy={busy}
                      onRequest={requestGrantAction}
                      onApply={(action) => void applyGrantAction(action)}
                      onCancel={() => {
                        haptic('light');
                        setPendingAction(null);
                      }}
                    />
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'access' ? (
          <div className="space-y-3">
            {(data?.users ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                Пока никому не выдан доступ
              </p>
            ) : (
              (data?.users ?? []).map((user) => (
                <UserGrantsCard
                  key={user.id}
                  user={user}
                  grantableApps={grantableApps}
                  pendingAction={pendingAction}
                  busy={busy}
                  onRequest={requestGrantAction}
                  onApply={(action) => void applyGrantAction(action)}
                  onCancel={() => {
                    haptic('light');
                    setPendingAction(null);
                  }}
                />
              ))
            )}
          </div>
        ) : null}

        {status ? (
          <p
            className="mt-4 rounded-2xl px-4 py-3 text-sm"
            style={{
              background: 'color-mix(in srgb, #0f766e 14%, transparent)',
            }}
          >
            {status}
          </p>
        ) : null}
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t px-3 pt-2"
        style={{
          background: 'color-mix(in srgb, var(--tg-secondary) 92%, white)',
          backdropFilter: 'blur(12px)',
          borderColor: 'color-mix(in srgb, var(--tg-hint) 25%, transparent)',
          paddingBottom: 'calc(10px + var(--safe-bottom))',
        }}
      >
        <div className="mx-auto grid max-w-md grid-cols-2 gap-1">
          {adminTabs.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  haptic('light');
                  setTab(item.id);
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

function UserGrantsCard({
  user,
  grantableApps,
  pendingAction,
  busy,
  onRequest,
  onApply,
  onCancel,
}: {
  user: AdminUser;
  grantableApps: PlatformApp[];
  pendingAction: PendingGrantAction | null;
  busy: boolean;
  onRequest: (userId: number, app: PlatformApp, enabled: boolean) => void;
  onApply: (action: PendingGrantAction) => void;
  onCancel: () => void;
}) {
  const grantSlugs = new Set(user.grants.map((g) => g.slug));

  return (
    <article
      className="rounded-[28px] px-5 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
      style={{
        background: 'color-mix(in srgb, white 72%, var(--tg-secondary))',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">
            {user.firstName ?? 'Без имени'}
          </h3>
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            ID {user.id}
            {user.username ? ` · @${user.username}` : ''}
          </p>
        </div>
        {user.isAdmin ? (
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white">
            админ
          </span>
        ) : null}
      </div>
      <div className="space-y-2">
        {grantableApps.map((app) => {
          const on = grantSlugs.has(app.slug);
          const accent = appAccent(app.slug, app.color);
          const palette = on ? grantPalette.yes : grantPalette.no;
          const pending = pendingAction;
          const isPending =
            pending?.userId === user.id && pending.app.slug === app.slug;

          return (
            <div
              key={app.id}
              className="rounded-2xl px-3 py-3"
              style={{
                background: palette.card,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{
                    background: `linear-gradient(145deg, ${accent.from}, ${accent.to})`,
                  }}
                >
                  <AppIcon slug={app.slug} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{app.name}</p>
                  <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                    {on ? 'Доступ открыт' : 'Доступ закрыт'}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    background: palette.badgeBg,
                    color: palette.badgeText,
                  }}
                >
                  {on ? 'Есть' : 'Нет'}
                </span>
              </div>

              {user.isAdmin ? (
                <p className="mt-3 text-xs" style={{ color: 'var(--tg-hint)' }}>
                  У администратора доступы нельзя менять
                </p>
              ) : isPending && pending ? (
                <div
                  className="mt-3 rounded-2xl px-3 py-3"
                  style={{
                    background:
                      'color-mix(in srgb, var(--tg-hint) 10%, transparent)',
                  }}
                >
                  <p className="text-sm font-medium">
                    {pending.enabled
                      ? `Выдать доступ к «${app.name}»?`
                      : `Снять доступ к «${app.name}»?`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onApply(pending)}
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
                      style={{
                        background: pending.enabled
                          ? grantPalette.yes.button
                          : grantPalette.no.button,
                        color: pending.enabled
                          ? grantPalette.yes.buttonText
                          : grantPalette.no.buttonText,
                      }}
                    >
                      {pending.enabled ? 'Выдать' : 'Снять'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={onCancel}
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
                      style={{
                        background:
                          'color-mix(in srgb, var(--tg-hint) 14%, transparent)',
                        color: 'var(--tg-text)',
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  {on ? (
                    <button
                      type="button"
                      disabled={busy || Boolean(pendingAction)}
                      onClick={() => onRequest(user.id, app, false)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
                      style={{
                        background: grantPalette.no.button,
                        color: grantPalette.no.buttonText,
                      }}
                    >
                      Снять доступ
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || Boolean(pendingAction)}
                      onClick={() => onRequest(user.id, app, true)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
                      style={{
                        background: grantPalette.yes.button,
                        color: grantPalette.yes.buttonText,
                      }}
                    >
                      Выдать доступ
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
