import { useEffect, useState } from 'react';
import { api, type Medication, type Overview } from '../api/client';
import { useTelegram } from '../telegram/TelegramProvider';

function formatDue(med: Medication) {
  if (med.isDue) {
    return 'пора принять';
  }
  if (med.daysUntilDue === 1) {
    return 'завтра';
  }
  if (med.daysUntilDue <= 0) {
    return 'пора принять';
  }
  return `через ${med.daysUntilDue} дн.`;
}

export function HomeScreen() {
  const { initData, haptic, user } = useTelegram();
  const [data, setData] = useState<Overview | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [muteBusy, setMuteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .overview(initData)
      .then((overview) => {
        if (!alive) {
          return;
        }
        if (user?.id != null && overview.ownerUserId !== user.id) {
          setError('Ошибка сессии: данные другого пользователя');
          setData(null);
          return;
        }
        setData(overview);
        setError(null);
      })
      .catch((err: Error) => {
        if (alive) {
          setError(err.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [initData, user?.id]);

  async function takeOne(id: string) {
    setBusyId(id);
    haptic('medium');
    try {
      const result = await api.take(initData, id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              medications: result.medications,
              dueCount: result.medications.filter((m) => m.isDue).length,
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleMute() {
    setMuteBusy(true);
    haptic('medium');
    try {
      const muted = data?.settings?.mutedToday;
      const next = muted
        ? await api.unmute(initData)
        : await api.muteToday(initData);
      setData((prev) =>
        prev
          ? {
              ...prev,
              settings: prev.settings
                ? {
                    ...prev.settings,
                    notificationsMutedUntil: next.notificationsMutedUntil,
                    mutedToday: next.mutedToday,
                  }
                : prev.settings,
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setMuteBusy(false);
    }
  }

  if (error && !data) {
    return (
      <div className="rounded-3xl px-5 py-5" style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-sm" style={{ color: 'var(--tg-hint)' }}>
        Загрузка...
      </div>
    );
  }

  const due = data.medications.filter((m) => m.active && m.isDue);
  const later = data.medications.filter((m) => m.active && !m.isDue);
  const mutedToday = Boolean(data.settings?.mutedToday);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] px-5 py-6">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(145deg, color-mix(in srgb, var(--tg-button) 24%, var(--app-surface-muted)), var(--app-surface))',
          }}
        />
        <div className="absolute -top-8 -right-6 h-28 w-28 rounded-full bg-teal-500/15 blur-2xl" />
        <div className="relative">
          <p
            className="font-display text-xs tracking-[0.2em] uppercase"
            style={{ color: 'var(--tg-button)' }}
          >
            Таблетки
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
            Привет, {user?.firstName ?? 'друг'}
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--tg-hint)' }}>
            {data.dueCount > 0
              ? `Сейчас нужно принять: ${data.dueCount}`
              : 'Сегодня всё принято по расписанию'}
          </p>
          <button
            type="button"
            disabled={muteBusy}
            onClick={() => void toggleMute()}
            className="mt-4 rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{
              background: mutedToday
                ? 'color-mix(in srgb, var(--tg-button) 22%, var(--app-surface))'
                : 'color-mix(in srgb, var(--tg-hint) 14%, transparent)',
              color: 'var(--tg-text)',
            }}
          >
            {mutedToday
              ? 'Уведомления выкл. до 00:00'
              : 'Выключить уведомления на сегодня'}
          </button>
        </div>
      </section>

      {due.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display px-1 text-lg font-semibold">К приёму</h2>
          {due.map((med) => (
            <MedCard
              key={med.id}
              med={med}
              busy={busyId === med.id}
              onTake={() => void takeOne(med.id)}
            />
          ))}
        </section>
      ) : null}

      {later.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display px-1 text-lg font-semibold">Дальше</h2>
          {later.map((med) => (
            <MedCard
              key={med.id}
              med={med}
              busy={busyId === med.id}
              onTake={() => void takeOne(med.id)}
              secondary
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function MedCard({
  med,
  busy,
  onTake,
  secondary,
}: {
  med: Medication;
  busy: boolean;
  onTake: () => void;
  secondary?: boolean;
}) {
  return (
    <article
      className="rounded-3xl px-5 py-4"
      style={{
        background: 'color-mix(in srgb, var(--app-surface-muted) 45%, var(--app-surface))',
        boxShadow: 'inset 0 0 0 1px var(--app-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{med.name}</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--tg-hint)' }}>
            {med.tabletsCount} шт × {med.mgPerTablet} мг
            {med.tabletsCount !== 1 ? ` · всего ${med.totalMg} мг` : ''}
          </p>
          <p className="mt-2 text-sm font-medium">
            {formatDue(med)} · раз в {med.intervalDays} дн.
          </p>
          {med.instructions ? (
            <p
              className="mt-2 whitespace-pre-wrap text-sm"
              style={{ color: 'var(--tg-hint)' }}
            >
              {med.instructions}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onTake}
          className="shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{
            background: secondary
              ? 'color-mix(in srgb, var(--tg-hint) 16%, transparent)'
              : 'var(--tg-button)',
            color: secondary ? 'var(--tg-text)' : 'var(--tg-button-text)',
          }}
        >
          Выпил
        </button>
      </div>
    </article>
  );
}
