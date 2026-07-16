import { useEffect, useState } from 'react';
import { api, type AdminOverview, type PlatformApp } from '../api/client';
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
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pt-5 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            onBack();
          }}
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={{
            background: 'color-mix(in srgb, var(--tg-hint) 14%, transparent)',
          }}
        >
          Назад
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold">Админка</h1>
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            Доступы к приложениям
          </p>
        </div>
      </div>

      <section
        className="mb-4 space-y-3 rounded-3xl px-5 py-4"
        style={{ background: 'var(--tg-secondary)' }}
      >
        <p className="text-sm font-medium">Добавить пользователя по ID</p>
        <div className="flex gap-2">
          <input
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder="Telegram ID"
            className="min-w-0 flex-1 rounded-xl border-0 px-3 py-2 outline-none"
            style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void addUser()}
            className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{
              background: 'var(--tg-button)',
              color: 'var(--tg-button-text)',
            }}
          >
            Добавить
          </button>
        </div>
      </section>

      <div className="space-y-3">
        {(data?.users ?? []).map((user) => {
          const grantSlugs = new Set(user.grants.map((g) => g.slug));
          return (
            <article
              key={user.id}
              className="rounded-3xl px-5 py-4"
              style={{ background: 'var(--tg-secondary)' }}
            >
              <div className="mb-3">
                <h3 className="font-display text-lg font-semibold">
                  {user.firstName ?? 'Без имени'}
                  {user.isAdmin ? ' · админ' : ''}
                </h3>
                <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                  ID {user.id}
                  {user.username ? ` · @${user.username}` : ''}
                </p>
              </div>
              <div className="space-y-2">
                {grantableApps.map((app) => {
                  const on = grantSlugs.has(app.slug);
                  return (
                    <button
                      key={app.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleGrant(user.id, app, !on)}
                      className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm disabled:opacity-50"
                      style={{
                        background: on
                          ? 'color-mix(in srgb, var(--tg-button) 18%, transparent)'
                          : 'var(--tg-bg)',
                      }}
                    >
                      <span>{app.name}</span>
                      <span className="font-medium">{on ? 'Есть' : 'Нет'}</span>
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
          className="mt-4 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--tg-button) 14%, transparent)',
          }}
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
