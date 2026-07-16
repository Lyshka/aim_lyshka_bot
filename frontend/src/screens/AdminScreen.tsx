import { useEffect, useState } from 'react';
import { api, type AdminOverview, type PlatformApp } from '../api/client';
import { AppIcon, appAccent } from '../components/AppIcon';
import { useTelegram } from '../telegram/TelegramProvider';

type AdminScreenProps = {
  onBack: () => void;
};

export function AdminScreen({ onBack }: AdminScreenProps) {
  const { initData, haptic, refreshSession } = useTelegram();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newUserId, setNewUserId] = useState('');

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

  async function toggleGrant(userId: number, app: PlatformApp, enabled: boolean) {
    setBusy(true);
    haptic('medium');
    try {
      const next = await api.setGrant(initData, {
        userId,
        appSlug: app.slug,
        enabled,
      });
      setData(next);
      await refreshSession();
      setStatus(enabled ? 'Доступ выдан' : 'Доступ снят');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  async function addUser() {
    const id = Number(newUserId.trim());
    if (!Number.isFinite(id) || id <= 0) {
      setStatus('Введи корректный Telegram ID');
      return;
    }
    const firstApp = grantableApps[0];
    if (!firstApp) {
      setStatus('Нет приложений для выдачи');
      return;
    }
    setBusy(true);
    try {
      const next = await api.setGrant(initData, {
        userId: id,
        appSlug: firstApp.slug,
        enabled: true,
      });
      setData(next);
      setNewUserId('');
      await refreshSession();
      setStatus(`Пользователь ${id} добавлен`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="launcher relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden px-4 pt-5 pb-10">
      <div className="launcher-orb launcher-orb-a" aria-hidden />
      <div className="launcher-orb launcher-orb-b" aria-hidden />

      <div className="relative z-10 mb-6 flex items-center gap-3">
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
          <h1 className="font-display text-2xl font-semibold tracking-tight">Админка</h1>
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            Пользователи и доступы
          </p>
        </div>
      </div>

      <section
        className="relative z-10 mb-4 space-y-3 rounded-[28px] px-5 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
        style={{
          background: 'color-mix(in srgb, white 70%, var(--tg-secondary))',
          backdropFilter: 'blur(10px)',
        }}
      >
        <p className="text-sm font-semibold">Добавить по Telegram ID</p>
        <div className="flex gap-2">
          <input
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder="897695033"
            className="min-w-0 flex-1 rounded-2xl border-0 px-3 py-2.5 outline-none"
            style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void addUser()}
            className="rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{
              background: 'linear-gradient(145deg, #0d9488, #115e59)',
              color: '#fff',
            }}
          >
            Добавить
          </button>
        </div>
      </section>

      <div className="relative z-10 space-y-3">
        {(data?.users ?? []).map((user) => {
          const grantSlugs = new Set(user.grants.map((g) => g.slug));
          return (
            <article
              key={user.id}
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
                  return (
                    <button
                      key={app.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleGrant(user.id, app, !on)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm disabled:opacity-50"
                      style={{
                        background: on
                          ? `color-mix(in srgb, ${accent.from} 16%, white)`
                          : 'var(--tg-bg)',
                      }}
                    >
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                        style={{
                          background: `linear-gradient(145deg, ${accent.from}, ${accent.to})`,
                        }}
                      >
                        <AppIcon slug={app.slug} className="h-5 w-5" />
                      </span>
                      <span className="flex-1 font-medium">{app.name}</span>
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          background: on ? accent.to : 'transparent',
                          color: on ? '#fff' : 'var(--tg-hint)',
                        }}
                      >
                        {on ? 'Есть' : 'Нет'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {status ? (
        <p
          className="relative z-10 mt-4 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, #0f766e 14%, transparent)',
          }}
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
