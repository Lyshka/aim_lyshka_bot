import { useEffect, useState } from 'react';
import { api, type HealthDay, type HealthOverview } from '../api/client';
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

function fmt(value: number | null | undefined, digits = 2) {
  if (value == null) {
    return null;
  }
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
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
    setWeight(
      next.today?.weightKg != null ? next.today.weightKg.toFixed(2) : '',
    );
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
          next.today?.weightKg != null ? next.today.weightKg.toFixed(2) : '',
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
        weightKg: weight.trim() ? Number(weight.replace(',', '.')) : undefined,
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

  const today = data.today;
  const weightValue =
    today?.weightKg != null ? today.weightKg : data.stats.lastWeightKg;

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
            Все метрики из Health
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
            {today?.steps?.toLocaleString('ru-RU') ?? '—'}
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
            {weightValue != null ? fmt(weightValue, 2) : '—'}
            <span className="ml-1 text-base font-medium opacity-60">кг</span>
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-3 grid grid-cols-2 gap-2">
        <Metric label="Жир %" value={fmt(today?.bodyFatPercent, 1)} />
        <Metric label="ИМТ" value={fmt(today?.bmi, 1)} />
        <Metric label="Рост" value={fmt(today?.heightCm, 0)} suffix="см" />
        <Metric
          label="Безжир. масса"
          value={fmt(today?.leanBodyMassKg, 2)}
          suffix="кг"
        />
        <Metric
          label="Скорость ходьбы"
          value={fmt(today?.walkingSpeedKmh, 1)}
          suffix="км/ч"
        />
        <Metric
          label="Длина шага"
          value={fmt(today?.walkingStepLengthCm, 0)}
          suffix="см"
        />
        <Metric label="Вода %" value={fmt(today?.waterPercent, 1)} />
      </div>

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
              placeholder="102.95"
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
          POST http://IP:8080/api/health/ingest
          {data.ingestConfigured ? ' · токен задан' : ' · токен не задан'}
        </p>
        <p className="mt-2 break-all">userId: {user?.id}</p>
      </section>

      {data.history.length > 0 ? (
        <section className="relative z-10 mt-6">
          <h2 className="font-display mb-3 text-lg font-semibold">История</h2>
          <div className="space-y-2">
            {data.history.map((row) => (
              <HistoryRow key={row.id} row={row} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function HistoryRow({ row }: { row: HealthDay }) {
  return (
    <article
      className="rounded-2xl px-4 py-3"
      style={{
        background: 'color-mix(in srgb, white 70%, #dbeafe)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{formatDay(row.day)}</p>
          <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
            {row.source}
          </p>
        </div>
        <div className="text-right text-sm">
          <p>
            {row.steps != null ? `${row.steps.toLocaleString('ru-RU')} шагов` : '—'}
          </p>
          <p style={{ color: 'var(--tg-hint)' }}>
            {row.weightKg != null ? `${fmt(row.weightKg, 2)} кг` : '—'}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--tg-hint)' }}>
        {[
          row.bodyFatPercent != null ? `жир ${fmt(row.bodyFatPercent, 1)}%` : null,
          row.bmi != null ? `ИМТ ${fmt(row.bmi, 1)}` : null,
          row.leanBodyMassKg != null
            ? `безжир. ${fmt(row.leanBodyMassKg, 2)} кг`
            : null,
          row.heightCm != null ? `рост ${fmt(row.heightCm, 0)} см` : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'нет доп. метрик'}
      </p>
    </article>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | null | undefined;
  suffix?: string;
}) {
  return (
    <div
      className="rounded-2xl px-3 py-3 text-center"
      style={{ background: 'color-mix(in srgb, white 70%, #dbeafe)' }}
    >
      <p
        className="text-[10px] uppercase tracking-wide"
        style={{ color: 'var(--tg-hint)' }}
      >
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">
        {value != null ? `${value}${suffix ? ` ${suffix}` : ''}` : '—'}
      </p>
    </div>
  );
}
