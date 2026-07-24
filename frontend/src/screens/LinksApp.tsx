import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  api,
  type StudyItem,
  type StudyItemUrl,
  type StudyOverview,
  type StudySection,
  type StudyTrash,
} from '../api/client';
import { Shell } from '../components/Shell';
import { useTelegram } from '../telegram/TelegramProvider';

type LinksAppProps = {
  onBack: () => void;
};

type Tab = 'list' | 'trash';

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

function linkLabel(entry: StudyItemUrl) {
  const title = entry.title?.trim();
  if (title) {
    return title;
  }
  return hostLabel(entry.url);
}

function formatDeletedAt(value: string | null) {
  if (!value) {
    return '';
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function IconBtn({
  disabled,
  onClick,
  label,
  tone = 'neutral',
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  label: string;
  tone?: 'neutral' | 'danger';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl disabled:opacity-50"
      style={
        tone === 'danger'
          ? {
              background:
                'color-mix(in srgb, var(--app-danger) 12%, var(--app-surface))',
              color: 'var(--app-danger)',
              boxShadow:
                'inset 0 0 0 1px color-mix(in srgb, var(--app-danger) 22%, transparent)',
            }
          : {
              background:
                'color-mix(in srgb, var(--app-surface-muted) 45%, var(--app-surface))',
              color: 'var(--tg-text)',
              boxShadow: 'inset 0 0 0 1px var(--app-border)',
            }
      }
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4.2L19.1 9.1a1.8 1.8 0 0 0 0-2.5l-1.7-1.7a1.8 1.8 0 0 0-2.5 0L4 15.8V20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5 17.5 10.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 7.5 8.7 18.2A1.7 1.7 0 0 0 10.4 19.8h3.2a1.7 1.7 0 0 0 1.7-1.6L16 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 7 17 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 7 7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LinksApp({ onBack }: LinksAppProps) {
  const { initData, haptic, isAdmin } = useTelegram();
  const [tab, setTab] = useState<Tab>('list');
  const [data, setData] = useState<StudyOverview | null>(null);
  const [trash, setTrash] = useState<StudyTrash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);
  const [addingUrlsTo, setAddingUrlsTo] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemNote, setItemNote] = useState('');
  const [extraUrl, setExtraUrl] = useState('');
  const [extraUrlTitle, setExtraUrlTitle] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const canTrash = isAdmin || Boolean(data?.isAdmin);

  const tabs = useMemo(() => {
    const base: { id: Tab; label: string }[] = [
      { id: 'list', label: 'Ссылки' },
    ];
    if (canTrash) {
      base.push({ id: 'trash', label: 'Корзина' });
    }
    return base;
  }, [canTrash]);

  const load = useCallback(async () => {
    const overview = await api.studyOverview(initData);
    setData(overview);
    setError(null);
    return overview;
  }, [initData]);

  const loadTrash = useCallback(async () => {
    const next = await api.studyTrash(initData);
    setTrash(next);
    setError(null);
    return next;
  }, [initData]);

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    });
  }, [load]);

  useEffect(() => {
    if (tab !== 'trash' || !canTrash) {
      return;
    }
    void loadTrash().catch((err) => {
      setError(err instanceof Error ? err.message : 'Ошибка корзины');
    });
  }, [tab, canTrash, loadTrash]);

  async function runOverview(action: () => Promise<StudyOverview>) {
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

  async function runTrash(action: () => Promise<StudyTrash>) {
    setBusy(true);
    setError(null);
    try {
      const next = await action();
      setTrash(next);
      await load();
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
    await runOverview(() => api.studyCreateSection(initData, title));
  }

  async function renameSection(section: StudySection) {
    if (!renameValue.trim()) {
      return;
    }
    haptic('light');
    const title = renameValue.trim();
    setRenamingId(null);
    await runOverview(() =>
      api.studyUpdateSection(initData, { sectionId: section.id, title }),
    );
  }

  async function removeSection(section: StudySection) {
    haptic('heavy');
    await runOverview(() => api.studyDeleteSection(initData, section.id));
    if (openSectionId === section.id) {
      setOpenSectionId(null);
    }
    if (addingItemFor === section.id) {
      setAddingItemFor(null);
    }
  }

  async function createItem(sectionId: string) {
    const title = itemTitle.trim();
    if (!title) {
      setError('Укажи название');
      return;
    }
    haptic('medium');
    setItemTitle('');
    setItemNote('');
    setAddingItemFor(null);
    await runOverview(() =>
      api.studyCreateItem(initData, {
        sectionId,
        title,
        note: itemNote.trim() || undefined,
      }),
    );
  }

  async function updateItem(itemId: string) {
    const title = itemTitle.trim();
    if (!title) {
      setError('Укажи название');
      return;
    }
    haptic('medium');
    setItemTitle('');
    setItemNote('');
    setEditingItemId(null);
    await runOverview(() =>
      api.studyUpdateItem(initData, {
        itemId,
        title,
        note: itemNote.trim() || undefined,
      }),
    );
  }

  async function addUrlsToItem(itemId: string) {
    const url = extraUrl.trim();
    if (!url) {
      setError('Добавь ссылку');
      return;
    }
    try {
      new URL(normalizeUrl(url));
    } catch {
      setError('Некорректная ссылка');
      return;
    }
    haptic('medium');
    setExtraUrl('');
    setExtraUrlTitle('');
    setAddingUrlsTo(null);
    await runOverview(() =>
      api.studyAddUrls(initData, {
        itemId,
        url,
        title: extraUrlTitle.trim() || undefined,
      }),
    );
  }

  async function removeItem(item: StudyItem) {
    haptic('heavy');
    await runOverview(() => api.studyDeleteItem(initData, item.id));
    if (addingUrlsTo === item.id) {
      setAddingUrlsTo(null);
    }
    if (editingItemId === item.id) {
      setEditingItemId(null);
      setItemTitle('');
      setItemNote('');
    }
  }

  async function removeUrl(entry: StudyItemUrl) {
    haptic('heavy');
    await runOverview(() => api.studyDeleteUrl(initData, entry.id));
  }

  const trashCount =
    (trash?.sections.length ?? 0) +
    (trash?.items.length ?? 0) +
    (trash?.urls.length ?? 0);

  const activeTab = tabs.some((item) => item.id === tab) ? tab : 'list';

  const content = (
    <>
      <button
        type="button"
        onClick={() => {
          haptic('light');
          onBack();
        }}
        className="rounded-2xl px-3 py-2 text-sm font-medium"
        style={{
          background: 'color-mix(in srgb, var(--app-surface-muted) 55%, #65a30d)',
        }}
      >
        ← Назад
      </button>

      <div className="mt-3 mb-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {activeTab === 'trash' ? 'Корзина' : 'Ссылки'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          {activeTab === 'trash'
            ? 'Удалённое можно вернуть. Только для админа.'
            : 'Разделы, темы и полезные ссылки.'}
        </p>
      </div>

      {error ? (
        <p
          className="mb-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--app-danger) 12%, var(--tg-secondary))',
            color: 'var(--app-danger)',
          }}
        >
          {error}
        </p>
      ) : null}

      {activeTab === 'list' ? (
        <ListTab
          data={data}
          busy={busy}
          sectionTitle={sectionTitle}
          setSectionTitle={setSectionTitle}
          openSectionId={openSectionId}
          setOpenSectionId={setOpenSectionId}
          addingItemFor={addingItemFor}
          setAddingItemFor={setAddingItemFor}
          addingUrlsTo={addingUrlsTo}
          setAddingUrlsTo={setAddingUrlsTo}
          editingItemId={editingItemId}
          setEditingItemId={setEditingItemId}
          itemTitle={itemTitle}
          setItemTitle={setItemTitle}
          itemNote={itemNote}
          setItemNote={setItemNote}
          extraUrl={extraUrl}
          setExtraUrl={setExtraUrl}
          extraUrlTitle={extraUrlTitle}
          setExtraUrlTitle={setExtraUrlTitle}
          renamingId={renamingId}
          setRenamingId={setRenamingId}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          haptic={haptic}
          onCreateSection={() => void createSection()}
          onRenameSection={(section) => void renameSection(section)}
          onRemoveSection={(section) => void removeSection(section)}
          onCreateItem={(sectionId) => void createItem(sectionId)}
          onUpdateItem={(itemId) => void updateItem(itemId)}
          onAddUrls={(itemId) => void addUrlsToItem(itemId)}
          onRemoveItem={(item) => void removeItem(item)}
          onRemoveUrl={(entry) => void removeUrl(entry)}
        />
      ) : (
        <TrashTab
          trash={trash}
          trashCount={trashCount}
          busy={busy}
          haptic={haptic}
          onRestoreSection={(id) =>
            void runTrash(() => api.studyRestoreSection(initData, id))
          }
          onRestoreItem={(id) =>
            void runTrash(() => api.studyRestoreItem(initData, id))
          }
          onRestoreUrl={(id) =>
            void runTrash(() => api.studyRestoreUrl(initData, id))
          }
          onPurge={() => void runTrash(() => api.studyPurgeTrash(initData))}
        />
      )}
    </>
  );

  if (canTrash) {
    return (
      <Shell tab={activeTab} onTabChange={setTab} tabs={tabs}>
        {content}
      </Shell>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-md px-4 pt-5 pb-8">
      {content}
    </div>
  );
}

function ListTab({
  data,
  busy,
  sectionTitle,
  setSectionTitle,
  openSectionId,
  setOpenSectionId,
  addingItemFor,
  setAddingItemFor,
  addingUrlsTo,
  setAddingUrlsTo,
  editingItemId,
  setEditingItemId,
  itemTitle,
  setItemTitle,
  itemNote,
  setItemNote,
  extraUrl,
  setExtraUrl,
  extraUrlTitle,
  setExtraUrlTitle,
  renamingId,
  setRenamingId,
  renameValue,
  setRenameValue,
  haptic,
  onCreateSection,
  onRenameSection,
  onRemoveSection,
  onCreateItem,
  onUpdateItem,
  onAddUrls,
  onRemoveItem,
  onRemoveUrl,
}: {
  data: StudyOverview | null;
  busy: boolean;
  sectionTitle: string;
  setSectionTitle: (value: string) => void;
  openSectionId: string | null;
  setOpenSectionId: (value: string | null) => void;
  addingItemFor: string | null;
  setAddingItemFor: (value: string | null) => void;
  addingUrlsTo: string | null;
  setAddingUrlsTo: (value: string | null) => void;
  editingItemId: string | null;
  setEditingItemId: (value: string | null) => void;
  itemTitle: string;
  setItemTitle: (value: string) => void;
  itemNote: string;
  setItemNote: (value: string) => void;
  extraUrl: string;
  setExtraUrl: (value: string) => void;
  extraUrlTitle: string;
  setExtraUrlTitle: (value: string) => void;
  renamingId: string | null;
  setRenamingId: (value: string | null) => void;
  renameValue: string;
  setRenameValue: (value: string) => void;
  haptic: (type?: 'light' | 'medium' | 'heavy') => void;
  onCreateSection: () => void;
  onRenameSection: (section: StudySection) => void;
  onRemoveSection: (section: StudySection) => void;
  onCreateItem: (sectionId: string) => void;
  onUpdateItem: (itemId: string) => void;
  onAddUrls: (itemId: string) => void;
  onRemoveItem: (item: StudyItem) => void;
  onRemoveUrl: (entry: StudyItemUrl) => void;
}) {
  return (
    <>
      <section
        className="space-y-3 rounded-3xl px-4 py-4"
        style={{
          background: 'color-mix(in srgb, var(--app-surface-muted) 72%, #65a30d)',
        }}
      >
        <input
          value={sectionTitle}
          onChange={(e) => setSectionTitle(e.target.value)}
          placeholder="Новый раздел, например Рецепты"
          className="w-full rounded-xl border-0 px-3 py-2.5 text-sm outline-none"
          style={{ background: 'var(--app-surface)', color: 'var(--tg-text)' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onCreateSection();
            }
          }}
        />
        <button
          type="button"
          disabled={busy || !sectionTitle.trim()}
          onClick={onCreateSection}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
          style={{
            background: 'linear-gradient(145deg, #65a30d, #3f6212)',
            color: '#f7fee7',
          }}
        >
          Добавить раздел
        </button>
      </section>

      <div className="mt-4 space-y-3">
        {!data ? (
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            Загрузка…
          </p>
        ) : data.sections.length === 0 ? (
          <p
            className="rounded-3xl px-4 py-5 text-sm"
            style={{
              background: 'color-mix(in srgb, var(--app-surface-muted) 75%, #65a30d)',
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
                  background: 'color-mix(in srgb, var(--app-surface-muted) 75%, #65a30d)',
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
                    style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
                  >
                    Имя
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemoveSection(section)}
                    className="rounded-xl px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      background:
                        'color-mix(in srgb, var(--app-danger) 12%, var(--tg-secondary))',
                      color: 'var(--app-danger)',
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
                        background: 'var(--app-surface)',
                        color: 'var(--tg-text)',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onRenameSection(section);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onRenameSection(section)}
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
                        style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
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
                        Пока нет тем. Добавь название — ссылки можно будет потом.
                      </p>
                    ) : (
                      section.items.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl px-3 py-3"
                          style={{ background: 'var(--app-surface)' }}
                        >
                          {editingItemId === item.id ? (
                            <div className="space-y-2">
                              <input
                                value={itemTitle}
                                onChange={(e) => setItemTitle(e.target.value)}
                                placeholder="Название темы"
                                className="w-full rounded-xl border-0 px-3 py-2 text-sm outline-none"
                                style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
                              />
                              <textarea
                                value={itemNote}
                                onChange={(e) => setItemNote(e.target.value)}
                                placeholder="Объяснение (необязательно)"
                                rows={5}
                                className="w-full resize-y rounded-xl border-0 px-3 py-2 text-sm outline-none"
                                style={{
                                  minHeight: '7.5rem',
                                  background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))',
                                  boxShadow: 'inset 0 0 0 1px var(--app-border)',
                                }}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={busy || !itemTitle.trim()}
                                  onClick={() => onUpdateItem(item.id)}
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
                                    setEditingItemId(null);
                                    setItemTitle('');
                                    setItemNote('');
                                  }}
                                  className="rounded-xl px-3 py-2 text-sm"
                                  style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold">
                                    {item.title}
                                  </p>
                                  {item.note ? (
                                    <p
                                      className="mt-0.5 whitespace-pre-wrap text-xs"
                                      style={{ color: 'var(--tg-hint)' }}
                                    >
                                      {item.note}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <IconBtn
                                    disabled={busy}
                                    label="Изменить"
                                    onClick={() => {
                                      haptic('light');
                                      setEditingItemId(item.id);
                                      setAddingItemFor(null);
                                      setAddingUrlsTo(null);
                                      setItemTitle(item.title);
                                      setItemNote(item.note ?? '');
                                    }}
                                  >
                                    <PencilIcon />
                                  </IconBtn>
                                  <IconBtn
                                    disabled={busy}
                                    label="Удалить"
                                    tone="danger"
                                    onClick={() => onRemoveItem(item)}
                                  >
                                    <TrashIcon />
                                  </IconBtn>
                                </div>
                              </div>
                              <div className="mt-2 space-y-1.5">
                                {item.urls.length === 0 ? (
                                  <p
                                    className="text-xs"
                                    style={{ color: 'var(--tg-hint)' }}
                                  >
                                    Ссылок пока нет
                                  </p>
                                ) : (
                                  item.urls.map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="flex items-center gap-1.5"
                                    >
                                      <button
                                        type="button"
                                        className="min-w-0 flex-1 truncate rounded-xl px-2.5 py-2 text-left text-xs font-medium"
                                        style={{
                                          background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)',
                                          color: 'var(--app-link)',
                                        }}
                                        onClick={() => {
                                          haptic('light');
                                          openUrl(entry.url);
                                        }}
                                      >
                                        {linkLabel(entry)}
                                      </button>
                                      <IconBtn
                                        disabled={busy}
                                        label="Удалить ссылку"
                                        tone="danger"
                                        onClick={() => onRemoveUrl(entry)}
                                      >
                                        <CloseIcon />
                                      </IconBtn>
                                    </div>
                                  ))
                                )}
                              </div>

                              {addingUrlsTo === item.id ? (
                                <div className="mt-2 space-y-2">
                                  <input
                                    value={extraUrl}
                                    onChange={(e) => setExtraUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full rounded-xl border-0 px-3 py-2 text-sm outline-none"
                                    style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
                                  />
                                  <input
                                    value={extraUrlTitle}
                                    onChange={(e) =>
                                      setExtraUrlTitle(e.target.value)
                                    }
                                    placeholder="Название ссылки (необязательно)"
                                    className="w-full rounded-xl border-0 px-3 py-2 text-sm outline-none"
                                    style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={busy || !extraUrl.trim()}
                                      onClick={() => onAddUrls(item.id)}
                                      className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
                                      style={{
                                        background: '#65a30d',
                                        color: '#f7fee7',
                                      }}
                                    >
                                      Добавить
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddingUrlsTo(null);
                                        setExtraUrl('');
                                        setExtraUrlTitle('');
                                      }}
                                      className="rounded-xl px-3 py-2 text-sm"
                                      style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
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
                                    setAddingUrlsTo(item.id);
                                    setAddingItemFor(null);
                                    setEditingItemId(null);
                                    setExtraUrl('');
                                    setExtraUrlTitle('');
                                  }}
                                  className="mt-2 w-full rounded-xl px-3 py-2 text-xs font-semibold"
                                  style={{
                                    background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)',
                                    color: 'var(--app-link)',
                                  }}
                                >
                                  + Ссылка
                                </button>
                              )}
                            </>
                          )}
                        </article>
                      ))
                    )}

                    {addingItemFor === section.id ? (
                      <div
                        className="space-y-2 rounded-2xl px-3 py-3"
                        style={{ background: 'var(--app-surface)' }}
                      >
                        <input
                          value={itemTitle}
                          onChange={(e) => setItemTitle(e.target.value)}
                          placeholder="Название темы, например Борщ"
                          className="w-full rounded-xl border-0 px-3 py-2 text-sm outline-none"
                          style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
                        />
                        <textarea
                          value={itemNote}
                          onChange={(e) => setItemNote(e.target.value)}
                          placeholder="Объяснение (необязательно)"
                          rows={5}
                          className="w-full resize-y rounded-xl border-0 px-3 py-2 text-sm outline-none"
                          style={{
                            minHeight: '7.5rem',
                            background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))',
                            boxShadow: 'inset 0 0 0 1px var(--app-border)',
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy || !itemTitle.trim()}
                            onClick={() => onCreateItem(section.id)}
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
                              setItemNote('');
                            }}
                            className="rounded-xl px-3 py-2 text-sm"
                            style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
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
                          setAddingUrlsTo(null);
                          setEditingItemId(null);
                          setItemTitle('');
                          setItemNote('');
                          setExtraUrl('');
                          setExtraUrlTitle('');
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
    </>
  );
}

function TrashTab({
  trash,
  trashCount,
  busy,
  haptic,
  onRestoreSection,
  onRestoreItem,
  onRestoreUrl,
  onPurge,
}: {
  trash: StudyTrash | null;
  trashCount: number;
  busy: boolean;
  haptic: (type?: 'light' | 'medium' | 'heavy') => void;
  onRestoreSection: (id: string) => void;
  onRestoreItem: (id: string) => void;
  onRestoreUrl: (id: string) => void;
  onPurge: () => void;
}) {
  if (!trash) {
    return (
      <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
        Загрузка корзины…
      </p>
    );
  }

  if (trashCount === 0) {
    return (
      <div
        className="rounded-3xl px-5 py-8 text-center"
        style={{
          background: 'color-mix(in srgb, var(--app-surface-muted) 75%, #65a30d)',
        }}
      >
        <p className="font-display text-lg font-semibold">Корзина пуста</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--tg-hint)' }}>
          Удалённые разделы, темы и ссылки появятся здесь.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between gap-3 rounded-3xl px-4 py-3"
        style={{
          background: 'color-mix(in srgb, var(--app-surface-muted) 72%, #65a30d)',
        }}
      >
        <p className="text-sm font-semibold">{trashCount} в корзине</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            haptic('heavy');
            onPurge();
          }}
          className="rounded-2xl px-3 py-2 text-xs font-semibold disabled:opacity-50"
          style={{
            background: 'color-mix(in srgb, var(--app-danger) 14%, var(--tg-secondary))',
            color: 'var(--app-danger)',
          }}
        >
          Очистить
        </button>
      </div>

      {trash.sections.length > 0 ? (
        <TrashGroup title="Разделы">
          {trash.sections.map((section) => (
            <TrashCard
              key={section.id}
              title={section.title}
              meta={`${section.itemsCount} тем · ${section.urlsCount} ссылок · ${formatDeletedAt(section.deletedAt)}`}
              busy={busy}
              onRestore={() => {
                haptic('medium');
                onRestoreSection(section.id);
              }}
            />
          ))}
        </TrashGroup>
      ) : null}

      {trash.items.length > 0 ? (
        <TrashGroup title="Темы">
          {trash.items.map((item) => (
            <TrashCard
              key={item.id}
              title={item.title}
              meta={`${item.sectionTitle} · ${item.urlsCount} ссылок · ${formatDeletedAt(item.deletedAt)}`}
              busy={busy}
              onRestore={() => {
                haptic('medium');
                onRestoreItem(item.id);
              }}
            />
          ))}
        </TrashGroup>
      ) : null}

      {trash.urls.length > 0 ? (
        <TrashGroup title="Ссылки">
          {trash.urls.map((entry) => (
            <TrashCard
              key={entry.id}
              title={entry.title?.trim() || entry.host}
              meta={`${entry.itemTitle} · ${entry.sectionTitle} · ${formatDeletedAt(entry.deletedAt)}`}
              busy={busy}
              onRestore={() => {
                haptic('medium');
                onRestoreUrl(entry.id);
              }}
            />
          ))}
        </TrashGroup>
      ) : null}
    </div>
  );
}

function TrashGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="px-1 text-sm font-semibold">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function TrashCard({
  title,
  meta,
  busy,
  onRestore,
}: {
  title: string;
  meta: string;
  busy: boolean;
  onRestore: () => void;
}) {
  return (
    <article
      className="flex items-center gap-3 rounded-3xl px-4 py-3"
      style={{
        background: 'color-mix(in srgb, var(--app-surface-muted) 75%, #65a30d)',
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--tg-hint)' }}>
          {meta}
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onRestore}
        className="shrink-0 rounded-2xl px-3 py-2 text-xs font-semibold disabled:opacity-50"
        style={{
          background: 'linear-gradient(145deg, #65a30d, #3f6212)',
          color: '#f7fee7',
        }}
      >
        Вернуть
      </button>
    </article>
  );
}
