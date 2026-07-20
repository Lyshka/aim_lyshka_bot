import { useCallback, useEffect, useState } from 'react';
import { api, type HealthDay, type HealthOverview } from '../api/client';
import { DayRangeFilter } from '../components/DayRangeFilter';
import { Shell } from '../components/Shell';
import { useTelegram } from '../telegram/TelegramProvider';

type HealthAppProps = {
  onBack: () => void;
};

type Tab = 'home' | 'history';

const healthTabs = [
  { id: 'home' as const, label: 'Информация' },
  { id: 'history' as const, label: 'История' },
];

function formatDayTitle(day: string, timeZone: string) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(yesterdayDate);

  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  if (day === today) {
    return 'Сегодня';
  }
  if (day === yesterday) {
    return 'Вчера';
  }

  return date.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
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

function formatSyncTime(value: string | null | undefined, timeZone: string) {
  if (!value) {
    return null;
  }
  return new Date(value).toLocaleString('ru-RU', {
    timeZone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HealthApp({ onBack }: HealthAppProps) {
  const { initData, haptic } = useTelegram();
  const [data, setData] = useState<HealthOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setRefreshing(true);
    }
    try {
      const next = await api.healthOverview(initData);
      setData(next);
      setError(null);
    } catch (err) {
      setError((prev) => {
        if (prev) {
          return prev;
        }
        return err instanceof Error ? err.message : 'Ошибка загрузки';
      });
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  }, [initData]);

  useEffect(() => {
    load(true);
  }, [initData]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        load(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  useEffect(() => {
    if (tab === 'home' || tab === 'history') {
      load(true);
    }
  }, [tab, load]);

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
  const timeZone = data.timeZone || 'Europe/Moscow';
  const weightValue =
    today?.weightKg != null ? today.weightKg : data.profile.weightKg;
  const heightValue =
    today?.heightCm != null ? today.heightCm : data.profile.heightCm;
  const ageValue = data.profile.age;
  const lastSync = formatSyncTime(data.stats.lastSyncAt, timeZone);

  const filteredHistory =
    appliedFrom || appliedTo
      ? data.history.filter((row) => {
          if (appliedFrom && row.day < appliedFrom) {
            return false;
          }
          if (appliedTo && row.day > appliedTo) {
            return false;
          }
          return true;
        })
      : data.history;

  return (
    <>
      <div className="relative mx-auto w-full max-w-md">
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between gap-2">
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
            <button
              type="button"
              disabled={refreshing}
              onClick={() => {
                haptic('light');
                load();
              }}
              className="rounded-2xl px-3 py-2 text-sm font-medium disabled:opacity-60"
              style={{
                background: 'color-mix(in srgb, white 55%, #bfdbfe)',
              }}
            >
              {refreshing ? 'Обновление…' : 'Обновить'}
            </button>
          </div>

          <div className="mt-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Здоровье
            </h1>
            <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
              {lastSync ? `Синхронизация: ${lastSync}` : 'Ожидание данных'}
            </p>
          </div>
        </div>

        <Shell tab={tab} onTabChange={setTab} tabs={healthTabs}>
          {tab === 'home' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-[28px] px-4 py-5 shadow-[0_16px_40px_rgba(37,99,235,0.12)]"
                  style={{
                    background: 'linear-gradient(160deg, #3b82f6, #1d4ed8)',
                    color: '#fff',
                  }}
                >
                  <p className="text-[11px] font-semibold tracking-[0.14em] uppercase opacity-80">
                    Возраст
                  </p>
                  <p className="font-display mt-3 text-3xl font-semibold">
                    {ageValue != null ? ageValue : '—'}
                    {ageValue != null ? (
                      <span className="ml-1 text-base font-medium opacity-60">
                        лет
                      </span>
                    ) : null}
                  </p>
                </div>
                <div
                  className="rounded-[28px] px-4 py-5 shadow-[0_16px_40px_rgba(37,99,235,0.12)]"
                  style={{
                    background: 'linear-gradient(160deg, #2563eb, #1e40af)',
                    color: '#fff',
                  }}
                >
                  <p className="text-[11px] font-semibold tracking-[0.14em] uppercase opacity-80">
                    Рост
                  </p>
                  <p className="font-display mt-3 text-3xl font-semibold">
                    {heightValue != null ? fmt(heightValue, 0) : '—'}
                    {heightValue != null ? (
                      <span className="ml-1 text-base font-medium opacity-60">
                        см
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    {weightValue != null ? (
                      <span className="ml-1 text-base font-medium opacity-60">
                        кг
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Metric label="Жир %" value={fmt(today?.bodyFatPercent, 1)} />
                <Metric label="ИМТ" value={fmt(today?.bmi, 1)} />
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
                <Metric
                  label="Дней в истории"
                  value={String(data.stats.daysTracked)}
                />
              </div>
            </div>
          ) : null}

          {tab === 'history' ? (
            <div className="space-y-4">
              <DayRangeFilter
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
                onApply={() => {
                  setAppliedFrom(from);
                  setAppliedTo(to);
                }}
                onReset={() => {
                  setFrom('');
                  setTo('');
                  setAppliedFrom('');
                  setAppliedTo('');
                }}
                background="color-mix(in srgb, white 72%, #dbeafe)"
              />

              {filteredHistory.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                  Записей нет за выбранный период
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((row) => (
                    <HistoryRow key={row.id} row={row} timeZone={timeZone} />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </Shell>
      </div>
    </>
  );
}

function HistoryRow({ row, timeZone }: { row: HealthDay; timeZone: string }) {
  const metrics = [
    row.bodyFatPercent != null
      ? { label: 'Жир', value: `${fmt(row.bodyFatPercent, 1)}%` }
      : null,
    row.bmi != null ? { label: 'ИМТ', value: fmt(row.bmi, 1) } : null,
    row.leanBodyMassKg != null
      ? { label: 'Безжир.', value: `${fmt(row.leanBodyMassKg, 2)} кг` }
      : null,
    row.heightCm != null
      ? { label: 'Рост', value: `${fmt(row.heightCm, 0)} см` }
      : null,
    row.walkingSpeedKmh != null
      ? { label: 'Скорость', value: `${fmt(row.walkingSpeedKmh, 1)} км/ч` }
      : null,
    row.walkingStepLengthCm != null
      ? { label: 'Шаг', value: `${fmt(row.walkingStepLengthCm, 0)} см` }
      : null,
  ].filter(Boolean) as { label: string; value: string | null }[];

  const sparse =
    row.steps == null &&
    row.weightKg == null &&
    metrics.length === 0;

  return (
    <article
      className="overflow-hidden rounded-[28px] shadow-[0_12px_32px_rgba(37,99,235,0.08)]"
      style={{
        background: 'color-mix(in srgb, white 78%, #dbeafe)',
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{
          background:
            'linear-gradient(145deg, rgba(59,130,246,0.14), rgba(219,234,254,0.35))',
        }}
      >
        <div>
          <p className="font-display text-base font-semibold capitalize">
            {formatDayTitle(row.day, timeZone)}
          </p>
          <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
            {row.day}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">
            {row.steps != null
              ? `${row.steps.toLocaleString('ru-RU')} шагов`
              : '—'}
          </p>
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            {row.weightKg != null ? `${fmt(row.weightKg, 2)} кг` : '—'}
          </p>
        </div>
      </div>

      {metrics.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 px-4 py-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl px-3 py-2"
              style={{ background: 'color-mix(in srgb, white 65%, #dbeafe)' }}
            >
              <p
                className="text-[10px] uppercase tracking-wide"
                style={{ color: 'var(--tg-hint)' }}
              >
                {metric.label}
              </p>
              <p className="mt-1 text-sm font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
      ) : sparse ? (
        <p className="px-4 py-3 text-xs" style={{ color: 'var(--tg-hint)' }}>
          День без данных
        </p>
      ) : (
        <p className="px-4 py-3 text-xs" style={{ color: 'var(--tg-hint)' }}>
          Нет дополнительных метрик
        </p>
      )}
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
