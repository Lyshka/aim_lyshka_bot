import { useEffect, useState } from 'react';
import { api, type CatFeed, type CatPost } from '../api/client';
import { useTelegram } from '../telegram/TelegramProvider';

type CatsAppProps = {
  onBack: () => void;
};

function formatDate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function CatsApp({ onBack }: CatsAppProps) {
  const { initData, haptic } = useTelegram();
  const [feed, setFeed] = useState<CatFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .catsFeed(initData)
      .then((data) => {
        if (alive) {
          setFeed(data);
        }
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

  const history = feed.history.filter((item) => item.id !== feed.today.id);

  return (
    <div className="cats-app relative mx-auto min-h-[100dvh] w-full max-w-md overflow-hidden px-4 pt-5 pb-10">
      <div className="cats-glow" aria-hidden />

      <div className="relative z-10 mb-5 flex items-center gap-3">
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
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Котики
          </h1>
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            Каждый день в 6:00
          </p>
        </div>
      </div>

      <article className="relative z-10 overflow-hidden rounded-[32px] shadow-[0_24px_60px_rgba(194,65,12,0.18)]">
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

      {history.length > 0 ? (
        <section className="relative z-10 mt-8">
          <h2 className="font-display mb-4 text-lg font-semibold">История</h2>
          <div className="space-y-3">
            {history.map((item) => (
              <HistoryCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      ) : null}
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
