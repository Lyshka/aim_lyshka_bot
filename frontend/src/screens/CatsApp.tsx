import { useCallback, useEffect, useState } from 'react';
import { api, type CatFeed, type CatPost } from '../api/client';
import { DayRangeFilter } from '../components/DayRangeFilter';
import { Shell } from '../components/Shell';
import { useTelegram } from '../telegram/TelegramProvider';

type CatsAppProps = {
  onBack: () => void;
};

type Tab = 'home' | 'history';

const catsTabs = [
  { id: 'home' as const, label: 'Сегодня' },
  { id: 'history' as const, label: 'История' },
];

function formatDate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function CatsApp({ onBack }: CatsAppProps) {
  const { initData, haptic, isAdmin } = useTelegram();
  const [feed, setFeed] = useState<CatFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [timeValue, setTimeValue] = useState('06:00');
  const [timeStatus, setTimeStatus] = useState<string | null>(null);
  const [timeBusy, setTimeBusy] = useState(false);

  const loadFeed = useCallback(
    async (filters?: { from?: string; to?: string }) => {
      setError(null);
      const data = await api.catsFeed(initData, filters);
      setFeed(data);
      setTimeValue(formatTime(data.settings.reminderHour, data.settings.reminderMinute));
      return data;
    },
    [initData],
  );

  useEffect(() => {
    let alive = true;
    loadFeed()
      .catch((err: Error) => {
        if (alive) {
          setError(err.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [loadFeed]);

  useEffect(() => {
    if (tab !== 'history') {
      return;
    }
    let alive = true;
    loadFeed({
      from: appliedFrom || undefined,
      to: appliedTo || undefined,
    }).catch((err: Error) => {
      if (alive) {
        setError(err.message);
      }
    });
    return () => {
      alive = false;
    };
  }, [tab, appliedFrom, appliedTo, loadFeed]);

  async function saveTime() {
    const [hourPart, minutePart] = timeValue.split(':');
    const hour = Number(hourPart);
    const minute = Number(minutePart);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      setTimeStatus('Некорректное время');
      return;
    }

    setTimeBusy(true);
    setTimeStatus(null);
    haptic('medium');
    try {
      const settings = await api.catsTime(initData, { hour, minute });
      setFeed((prev) =>
        prev
          ? {
              ...prev,
              settings,
            }
          : prev,
      );
      setTimeValue(formatTime(settings.reminderHour, settings.reminderMinute));
      setTimeStatus('Время сохранено');
    } catch (err) {
      setTimeStatus(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setTimeBusy(false);
    }
  }

  if (error && !feed) {
    return (
      <div className="mx-auto max-w-md px-4 pt-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 rounded-2xl px-3 py-2 text-sm font-medium"
          style={{
            background: 'color-mix(in srgb, var(--tg-hint) 14%, transparent)',
          }}
        >
          ← Назад
        </button>
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          {error}
        </p>
      </div>
    );
  }

  if (!feed) {
    return (
      <div
        className="flex min-h-[60dvh] items-center justify-center text-sm"
        style={{ color: 'var(--tg-hint)' }}
      >
        Ищем котика...
      </div>
    );
  }

  const historyItems = feed.history.filter((item) => item.id !== feed.today.id);

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
            background: 'color-mix(in srgb, white 60%, #fdba74)',
            backdropFilter: 'blur(8px)',
          }}
        >
          ← Назад
        </button>

        <div className="mt-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Котики
          </h1>
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            Каждый день в {formatTime(feed.settings.reminderHour, feed.settings.reminderMinute)}
          </p>
        </div>
      </div>

      <Shell tab={tab} onTabChange={setTab} tabs={catsTabs}>
        {tab === 'home' ? (
          <div className="space-y-4">
            <article className="overflow-hidden rounded-[32px] shadow-[0_24px_60px_rgba(194,65,12,0.18)]">
              <div className="relative aspect-[4/5] overflow-hidden bg-orange-100">
                <img
                  src={feed.today.imageUrl}
                  alt="Котик дня"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-5 pt-24 pb-5">
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-orange-100/90 uppercase">
                    Котик дня · {formatDate(feed.today.deliveryDate)}
                  </p>
                  <p className="font-display mt-2 text-[1.35rem] leading-snug font-semibold text-white">
                    {feed.today.text}
                  </p>
                </div>
              </div>
            </article>

            <section
              className="space-y-3 rounded-3xl px-5 py-4"
              style={{
                background: 'color-mix(in srgb, white 72%, #ffedd5)',
              }}
            >
              <div>
                <p className="text-sm font-medium">Время уведомления</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--tg-hint)' }}>
                  {isAdmin
                    ? 'Админ может менять время без ограничений'
                    : feed.settings.canChangeTime
                      ? 'Можно изменить один раз до 00:00'
                      : 'Сегодня время уже менялось — снова можно после 00:00'}
                </p>
              </div>
              <label className="block text-sm">
                <span style={{ color: 'var(--tg-hint)' }}>Когда присылать котика</span>
                <input
                  type="time"
                  value={timeValue}
                  disabled={!feed.settings.canChangeTime || timeBusy}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border-0 px-3 py-2 outline-none disabled:opacity-50"
                  style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
                />
              </label>
              <button
                type="button"
                disabled={!feed.settings.canChangeTime || timeBusy}
                onClick={() => void saveTime()}
                className="w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: 'var(--tg-button)',
                  color: 'var(--tg-button-text)',
                }}
              >
                Сохранить время
              </button>
              {timeStatus ? (
                <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                  {timeStatus}
                </p>
              ) : null}
            </section>
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
              background="color-mix(in srgb, white 72%, #ffedd5)"
            />

            {historyItems.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                Записей нет за выбранный период
              </p>
            ) : (
              <div className="space-y-3">
                {historyItems.map((item) => (
                  <HistoryCard key={item.id} post={item} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Shell>
    </div>
  );
}

function HistoryCard({ post }: { post: CatPost }) {
  return (
    <article
      className="flex gap-3 overflow-hidden rounded-[24px] p-2 pr-3"
      style={{
        background: 'color-mix(in srgb, white 72%, #ffedd5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <img
        src={post.imageUrl}
        alt=""
        className="h-20 w-20 shrink-0 rounded-[18px] object-cover"
      />
      <div className="min-w-0 py-1">
        <p className="text-[11px] font-medium" style={{ color: 'var(--tg-hint)' }}>
          {formatDate(post.deliveryDate)}
        </p>
        <p className="mt-1 line-clamp-3 text-sm leading-snug">{post.text}</p>
      </div>
    </article>
  );
}
