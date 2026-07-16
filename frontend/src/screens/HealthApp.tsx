import { useEffect, useState } from 'react';
import { api, type HealthOverview } from '../api/client';
import { useTelegram } from '../telegram/TelegramProvider';

type HealthAppProps = {
  onBack: () => void;
};

function formatDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function HealthApp({ onBack }: HealthAppProps) {
  const { initData, haptic, user } = useTelegram();
  const [data, setData] = useState<HealthOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState('');
  const [weight, setWeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    const next = await api.healthOverview(initData);
    setData(next);
    setSteps(next.today?.steps != null ? String(next.today.steps) : '');
    setWeight(next.today?.weightKg != null ? String(next.today.weightKg) : '');
  }

  useEffect(() => {
    let alive = true;
    api
      .healthOverview(initData)
      .then((next) => {
        if (!alive) {
          return;
        }
        setData(next);
        setSteps(next.today?.steps != null ? String(next.today.steps) : '');
        setWeight(
          next.today?.weightKg != null ? String(next.today.weightKg) : '',
        );
      })
      .catch((err: Error) => {
        if (alive) {
          setError(err.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [initData]);

  async function saveManual() {
    setBusy(true);
    haptic('medium');
    try {
      await api.healthManual(initData, {
        steps: steps.trim() ? Number(steps) : undefined,
        weightKg: weight.trim() ? Number(weight) : undefined,
      });
      await load();
      setStatus('Сохранено');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка');
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

  return (
    <div className="health-app relative mx-auto min-h-[100dvh] w-full max-w-md overflow-hidden px-4 pt-5 pb-10">
      <div className="health-glow" aria-hidden />

      <div className="relative z-10 mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            onBack();
          }}
          className="rounded-2xl px-3 py-2 text-sm font-medium"
          style={{
            background: 'color-mix(in srgb, white 55%, #bfdbfe)',
          }}
        >
          ← Назад
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Здоровье
          </h1>
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            Шаги и вес
          </p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-3">
        <div
          className="rounded-[28px] px-4 py-5 shadow-[0_16px_40px_rgba(37,99,235,0.12)]"
          style={{
            background: 'linear-gradient(160deg, #3b82f6, #1d4ed8)',
            color: '#fff',
          }}
        >
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase opacity-80">
            Шаги сегодня
          </p>
          <p className="font-display mt-3 text-3xl font-semibold">
            {data.today?.steps?.toLocaleString('ru-RU') ?? '—'}
          </p>
        </div>
        <div
          className="rounded-[28px] px-4 py-5"
          style={{
            background: 'color-mix(in srgb, white 70%, #dbeafe)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <p
            className="text-[11px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: 'var(--tg-hint)' }}
          >
            Вес
          </p>
          <p className="font-display mt-3 text-3xl font-semibold">
            {data.today?.weightKg != null
              ? `${data.today.weightKg.toFixed(1)}`
              : data.stats.lastWeightKg != null
                ? `${data.stats.lastWeightKg.toFixed(1)}`
                : '—'}
            <span className="ml-1 text-base font-medium opacity-60">кг</span>
          </p>
        </div>
      </div>

      {(data.today?.bodyFatPercent != null ||
        data.today?.muscleMassKg != null ||
        data.today?.waterPercent != null) && (
        <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
          <Metric label="Жир %" value={data.today.bodyFatPercent} />
          <Metric label="Мышцы" value={data.today.muscleMassKg} suffix="кг" />
          <Metric label="Вода %" value={data.today.waterPercent} />
        </div>
      )}

      <section
        className="relative z-10 mt-5 space-y-3 rounded-[28px] px-4 py-4"
        style={{
          background: 'color-mix(in srgb, white 72%, #dbeafe)',
        }}
      >
        <p className="text-sm font-semibold">Записать вручную</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span style={{ color: 'var(--tg-hint)' }}>Шаги</span>
            <input
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border-0 px-3 py-2 outline-none"
              style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
            />
          </label>
          <label className="block text-sm">
            <span style={{ color: 'var(--tg-hint)' }}>Вес, кг</span>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border-0 px-3 py-2 outline-none"
              style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveManual()}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(145deg, #3b82f6, #1d4ed8)' }}
        >
          Сохранить
        </button>
        {status ? (
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            {status}
          </p>
        ) : null}
      </section>

      <section
        className="relative z-10 mt-4 rounded-[28px] px-4 py-4 text-sm leading-relaxed"
        style={{
          background: 'color-mix(in srgb, white 72%, #dbeafe)',
          color: 'var(--tg-hint)',
        }}
      >
        <p className="font-semibold text-[var(--tg-text)]">Автосинхронизация</p>
        <p className="mt-2">
          Из Telegram нельзя напрямую читать Apple Health и ОКОК. Рабочая схема:
          ОКОК → Apple Health → Shortcuts / Health Auto Export → наш webhook.
        </p>
        <p className="mt-2">
          Токен: <span className="font-medium text-[var(--tg-text)]">HEALTH_INGEST_TOKEN</span>
          {data.ingestConfigured ? ' · задан' : ' · не задан в .env'}
        </p>
        <p className="mt-2 break-all">
          POST /api/health/ingest
          <br />
          userId: {user?.id}
        </p>
      </section>

      {data.history.length > 0 ? (
        <section className="relative z-10 mt-6">
          <h2 className="font-display mb-3 text-lg font-semibold">История</h2>
          <div className="space-y-2">
            {data.history.map((row) => (
              <article
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: 'color-mix(in srgb, white 70%, #dbeafe)',
                }}
              >
                <div>
                  <p className="text-sm font-semibold">{formatDay(row.day)}</p>
                  <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                    {row.source}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>{row.steps != null ? `${row.steps.toLocaleString('ru-RU')} шагов` : '—'}</p>
                  <p style={{ color: 'var(--tg-hint)' }}>
                    {row.weightKg != null ? `${row.weightKg.toFixed(1)} кг` : '—'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
}) {
  return (
    <div
      className="rounded-2xl px-3 py-3 text-center"
      style={{ background: 'color-mix(in srgb, white 70%, #dbeafe)' }}
    >
      <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--tg-hint)' }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">
        {value != null ? `${value}${suffix ? ` ${suffix}` : ''}` : '—'}
      </p>
    </div>
  );
}
