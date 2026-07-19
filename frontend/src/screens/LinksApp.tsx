import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type StudyItem,
  type StudyItemUrl,
  type StudyOverview,
  type StudySection,
} from '../api/client';
import { useTelegram } from '../telegram/TelegramProvider';

type LinksAppProps = {
  onBack: () => void;
};

function openUrl(url: string) {
  try {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
      return;
    }
  } catch {}
  window.open(url, '_blank', 'noopener,noreferrer');
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function parseUrlLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const urls: string[] = [];
  for (const line of lines) {
    const urlMatch =
      line.match(/https?:\/\/\S+/i) ||
      line.match(/(?:^|\s)?((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?)$/i);
    const raw = (urlMatch?.[0] ?? line).trim();
    const url = normalizeUrl(raw);
    if (!url) {
      continue;
    }
    try {
      new URL(url);
      if (!urls.includes(url)) {
        urls.push(url);
      }
    } catch {}
  }
  return urls;
}

export function LinksApp({ onBack }: LinksAppProps) {
  const { initData, haptic } = useTelegram();
  const [data, setData] = useState<StudyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const load = useCallback(async () => {
    const overview = await api.studyOverview(initData);
    setData(overview);
    setError(null);
    return overview;
  }, [initData]);

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    });
  }, [load]);

  async function run(action: () => Promise<StudyOverview>) {
    setBusy(true);
    setError(null);
    try {
      const next = await action();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  async function createSection() {
    if (!sectionTitle.trim()) {
      return;
    }
    haptic('medium');
    const title = sectionTitle.trim();
    setSectionTitle('');
    await run(() => api.studyCreateSection(initData, title));
  }

  async function renameSection(section: StudySection) {
    if (!renameValue.trim()) {
      return;
    }
    haptic('light');
    const title = renameValue.trim();
    setRenamingId(null);
    await run(() =>
      api.studyUpdateSection(initData, { sectionId: section.id, title }),
    );
  }

  async function removeSection(section: StudySection) {
    haptic('heavy');
    await run(() => api.studyDeleteSection(initData, section.id));
    if (openSectionId === section.id) {
      setOpenSectionId(null);
    }
    if (addingItemFor === section.id) {
      setAddingItemFor(null);
    }
  }

  async function createItem(sectionId: string) {
    const title = itemTitle.trim();
    const urls = parseUrlLines(urlsText);
    if (!title) {
      setError('Укажи название');
      return;
    }
    if (urls.length === 0) {
      setError('Добавь хотя бы одну ссылку');
      return;
    }
    haptic('medium');
    setItemTitle('');
    setUrlsText('');
    setAddingItemFor(null);
    await run(() =>
      api.studyCreateItem(initData, { sectionId, title, urls }),
    );
  }

  async function removeItem(item: StudyItem) {
    haptic('heavy');
    await run(() => api.studyDeleteItem(initData, item.id));
  }

  async function removeUrl(entry: StudyItemUrl) {
    haptic('heavy');
    await run(() => api.studyDeleteUrl(initData, entry.id));
  }

  return (
    <div className="relative mx-auto w-full max-w-md px-4 pt-5 pb-8">
      <button
        type="button"
        onClick={() => {
          haptic('light');
          onBack();
        }}
        className="rounded-2xl px-3 py-2 text-sm font-medium"
        style={{
          background: 'color-mix(in srgb, white 55%, #65a30d)',
        }}
      >
        ← Назад
      </button>

      <div className="mt-3 mb-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Ссылки
        </h1>
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          Разделы, темы и полезные ссылки.
        </p>
      </div>

      <section
        className="space-y-3 rounded-3xl px-4 py-4"
        style={{
          background: 'color-mix(in srgb, white 72%, #65a30d)',
        }}
      >
        <input
          value={sectionTitle}
          onChange={(e) => setSectionTitle(e.target.value)}
          placeholder="Новый раздел, например DevOps"
          className="w-full rounded-xl border-0 px-3 py-2.5 text-sm outline-none"
          style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void createSection();
            }
          }}
        />
        <button
          type="button"
          disabled={busy || !sectionTitle.trim()}
          onClick={() => void createSection()}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
          style={{
            background: 'linear-gradient(145deg, #65a30d, #3f6212)',
            color: '#f7fee7',
          }}
        >
          Добавить раздел
        </button>
      </section>

      {error ? (
        <p
          className="mt-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, #b42318 12%, var(--tg-secondary))',
            color: '#9f1239',
          }}
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {!data ? (
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            Загрузка…
          </p>
        ) : data.sections.length === 0 ? (
          <p
            className="rounded-3xl px-4 py-5 text-sm"
            style={{
              background: 'color-mix(in srgb, white 75%, #65a30d)',
              color: 'var(--tg-hint)',
            }}
          >
            Пока пусто. Создай раздел, потом тему с несколькими ссылками.
          </p>
        ) : (
          data.sections.map((section) => {
            const open = openSectionId === section.id;
            return (
              <section
                key={section.id}
                className="overflow-hidden rounded-3xl"
                style={{
                  background: 'color-mix(in srgb, white 75%, #65a30d)',
                }}
              >
                <div className="flex items-start gap-2 px-4 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      haptic('light');
                      setOpenSectionId(open ? null : section.id);
                    }}
                  >
                    <p className="truncate text-base font-semibold">
                      {section.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                      {section.items.length} тем
                      {open ? ' · скрыть' : ' · открыть'}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      haptic('light');
                      setRenamingId(section.id);
                      setRenameValue(section.title);
                    }}
                    className="rounded-xl px-2.5 py-1.5 text-xs font-medium"
                    style={{ background: 'var(--tg-secondary)' }}
                  >
                    Имя
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeSection(section)}
                    className="rounded-xl px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      background:
                        'color-mix(in srgb, #b42318 12%, var(--tg-secondary))',
                      color: '#9f1239',
                    }}
                  >
                    Удалить
                  </button>
                </div>

                {renamingId === section.id ? (
                  <div className="space-y-2 border-t border-black/5 px-4 py-3">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-full rounded-xl border-0 px-3 py-2 text-sm outline-none"
                      style={{
                        background: 'var(--tg-bg)',
                        color: 'var(--tg-text)',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void renameSection(section);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void renameSection(section)}
                        className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold"
                        style={{
                          background: '#65a30d',
                          color: '#f7fee7',
                        }}
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="rounded-xl px-3 py-2 text-sm"
                        style={{ background: 'var(--tg-secondary)' }}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : null}

                {open ? (
                  <div className="space-y-2 border-t border-black/5 px-4 py-3">
                    {section.items.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                        Пока нет тем. Добавь название и ссылки к нему.
                      </p>
                    ) : (
                      section.items.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl px-3 py-3"
                          style={{ background: 'var(--tg-bg)' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">
                                {item.title}
                              </p>
                              {item.note ? (
                                <p
                                  className="mt-0.5 text-xs"
                                  style={{ color: 'var(--tg-hint)' }}
                                >
                                  {item.note}
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void removeItem(item)}
                              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium"
                              style={{
                                background:
                                  'color-mix(in srgb, #b42318 10%, var(--tg-secondary))',
                                color: '#9f1239',
                              }}
                            >
                              Удалить тему
                            </button>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {item.urls.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-center gap-1.5"
                              >
                                <button
                                  type="button"
                                  className="min-w-0 flex-1 truncate rounded-xl px-2.5 py-2 text-left text-xs font-medium"
                                  style={{
                                    background: 'var(--tg-secondary)',
                                    color: '#3f6212',
                                  }}
                                  onClick={() => {
                                    haptic('light');
                                    openUrl(entry.url);
                                  }}
                                >
                                  {hostLabel(entry.url)}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void removeUrl(entry)}
                                  className="shrink-0 rounded-lg px-2 py-2 text-[11px] font-medium"
                                  style={{
                                    background:
                                      'color-mix(in srgb, #b42318 10%, var(--tg-secondary))',
                                    color: '#9f1239',
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))
                    )}

                    {addingItemFor === section.id ? (
                      <div
                        className="space-y-2 rounded-2xl px-3 py-3"
                        style={{ background: 'var(--tg-bg)' }}
                      >
                        <input
                          value={itemTitle}
                          onChange={(e) => setItemTitle(e.target.value)}
                          placeholder="Название темы, например Docker"
                          className="w-full rounded-xl border-0 px-3 py-2 text-sm outline-none"
                          style={{ background: 'var(--tg-secondary)' }}
                        />
                        <textarea
                          value={urlsText}
                          onChange={(e) => setUrlsText(e.target.value)}
                          rows={5}
                          placeholder={
                            'Ссылки к этой теме, по одной в строке\nhttps://docs.docker.com\nhttps://hub.docker.com'
                          }
                          className="w-full resize-y rounded-xl border-0 px-3 py-2 text-sm outline-none"
                          style={{ background: 'var(--tg-secondary)' }}
                        />
                        <p
                          className="text-[11px]"
                          style={{ color: 'var(--tg-hint)' }}
                        >
                          Одна тема — один элемент, внутри сколько угодно ссылок
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={
                              busy || !itemTitle.trim() || !urlsText.trim()
                            }
                            onClick={() => void createItem(section.id)}
                            className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
                            style={{
                              background: '#65a30d',
                              color: '#f7fee7',
                            }}
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingItemFor(null);
                              setItemTitle('');
                              setUrlsText('');
                            }}
                            className="rounded-xl px-3 py-2 text-sm"
                            style={{ background: 'var(--tg-secondary)' }}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          haptic('light');
                          setAddingItemFor(section.id);
                          setOpenSectionId(section.id);
                        }}
                        className="w-full rounded-2xl px-3 py-2.5 text-sm font-semibold"
                        style={{
                          background:
                            'linear-gradient(145deg, #65a30d, #3f6212)',
                          color: '#f7fee7',
                        }}
                      >
                        + Тема
                      </button>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
