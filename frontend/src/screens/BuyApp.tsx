import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  type BuyList,
  type BuyListItem,
  type BuyOverview,
} from '../api/client';
import { Shell } from '../components/Shell';
import { useTelegram } from '../telegram/TelegramProvider';

type BuyAppProps = {
  onBack: () => void;
};

type Tab = 'lists' | 'join';

function openUrl(url: string) {
  try {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
      return;
    }
  } catch {}
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
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

function listMeta(list: BuyList) {
  if (list.isShared) {
    const count = list.members.length;
    return count >= 2 ? 'На двоих' : 'Общий · ждём второго';
  }
  return 'Личный';
}

export function BuyApp({ onBack }: BuyAppProps) {
  const { initData, haptic, user } = useTelegram();
  const [tab, setTab] = useState<Tab>('lists');
  const [data, setData] = useState<BuyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListShared, setNewListShared] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [addMode, setAddMode] = useState<'wb' | 'manual'>('wb');
  const [wbUrl, setWbUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualProductUrl, setManualProductUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewNote, setPreviewNote] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  const tabs = useMemo(
    () => [
      { id: 'lists' as const, label: 'Списки' },
      { id: 'join' as const, label: 'Код' },
    ],
    [],
  );

  const activeList = useMemo(
    () => data?.lists.find((list) => list.id === activeListId) ?? null,
    [data, activeListId],
  );

  const load = useCallback(async () => {
    const overview = await api.buyOverview(initData);
    setData(overview);
    setError(null);
    return overview;
  }, [initData]);

  useEffect(() => {
    void load().catch((err: Error) => {
      setError(err.message);
    });
  }, [load]);

  async function runAction(action: () => Promise<BuyOverview>) {
    setBusy(true);
    setError(null);
    haptic('medium');
    try {
      const overview = await action();
      setData(overview);
      return overview;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateList() {
    const title = newListTitle.trim();
    if (!title) {
      setError('Укажи название списка');
      return;
    }
    const shared = newListShared;
    const overview = await runAction(() =>
      api.buyCreateList(initData, { title, shared }),
    );
    setNewListTitle('');
    setNewListShared(false);
    const created = overview.lists.find(
      (list) => list.title === title && list.isShared === shared,
    );
    if (created) {
      setActiveListId(created.id);
      setTab('lists');
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError('Введи код');
      return;
    }
    const overview = await runAction(() => api.buyJoinList(initData, code));
    setJoinCode('');
    const joined = overview.lists.find((list) => list.shareCode === code);
    if (joined) {
      setActiveListId(joined.id);
      setTab('lists');
    }
  }

  async function handlePreviewWb() {
    const url = normalizeUrl(wbUrl);
    if (!url) {
      setError('Вставь ссылку Wildberries');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const preview = await api.buyPreviewWildberries(initData, url);
      setPreviewTitle(preview.title);
      setPreviewNote(preview.note);
      setPreviewImageUrl(preview.imageUrl);
      haptic('light');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddItem() {
    if (!activeList) {
      return;
    }
    if (addMode === 'wb') {
      await runAction(() =>
        api.buyAddItem(initData, {
          listId: activeList.id,
          url: normalizeUrl(wbUrl),
          note: previewNote.trim() || undefined,
        }),
      );
      setWbUrl('');
      setPreviewTitle('');
      setPreviewNote('');
      setPreviewImageUrl('');
      return;
    }
    await runAction(() =>
      api.buyAddItem(initData, {
        listId: activeList.id,
        title: manualTitle.trim(),
        note: manualNote.trim() || undefined,
        imageUrl: manualImageUrl.trim() || undefined,
        productUrl: manualProductUrl.trim() || undefined,
      }),
    );
    setManualTitle('');
    setManualNote('');
    setManualImageUrl('');
    setManualProductUrl('');
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-md px-4 pt-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm font-medium"
          style={{ color: 'var(--tg-button)' }}
        >
          ← Назад
        </button>
        <p className="text-sm" style={{ color: 'var(--app-danger)' }}>
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

  if (activeList) {
    return (
      <ListScreen
        list={activeList}
        busy={busy}
        error={error}
        userId={user?.id ?? 0}
        addMode={addMode}
        wbUrl={wbUrl}
        previewTitle={previewTitle}
        previewNote={previewNote}
        previewImageUrl={previewImageUrl}
        manualTitle={manualTitle}
        manualNote={manualNote}
        manualImageUrl={manualImageUrl}
        manualProductUrl={manualProductUrl}
        onBack={() => setActiveListId(null)}
        onSetAddMode={setAddMode}
        onSetWbUrl={setWbUrl}
        onSetManualTitle={setManualTitle}
        onSetManualNote={setManualNote}
        onSetManualImageUrl={setManualImageUrl}
        onSetManualProductUrl={setManualProductUrl}
        onPreviewWb={() => void handlePreviewWb()}
        onAddItem={() => void handleAddItem()}
        onCopyCode={async () => {
          if (!activeList.shareCode) {
            return;
          }
          await copyText(activeList.shareCode);
          haptic('light');
        }}
        onLeave={() =>
          void runAction(() => api.buyLeaveList(initData, activeList.id)).then(
            () => setActiveListId(null),
          )
        }
        onDelete={() =>
          void runAction(() => api.buyDeleteList(initData, activeList.id)).then(
            () => setActiveListId(null),
          )
        }
        onToggle={(itemId) =>
          void runAction(() => api.buyToggleItem(initData, itemId))
        }
        onDeleteItem={(itemId) =>
          void runAction(() => api.buyDeleteItem(initData, itemId))
        }
      />
    );
  }

  return (
    <Shell tab={tab} onTabChange={setTab} tabs={tabs}>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-medium"
        style={{ color: 'var(--tg-button)' }}
      >
        ← Лаунчер
      </button>

      <div
        className="rounded-[28px] px-5 py-5"
        style={{
          background:
            'linear-gradient(145deg, color-mix(in srgb, var(--tg-button) 18%, var(--app-surface-muted)), var(--app-surface))',
        }}
      >
        <p
          className="font-display text-xs tracking-[0.2em] uppercase"
          style={{ color: 'var(--tg-button)' }}
        >
          Купить
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          Что нужно
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--tg-hint)' }}>
          Личные списки или общий на двоих по коду
        </p>
      </div>

      {error ? (
        <p
          className="mt-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--app-danger) 12%, var(--tg-secondary))',
            color: 'var(--app-danger)',
          }}
        >
          {error}
        </p>
      ) : null}

      {tab === 'lists' ? (
        <div className="mt-5 space-y-3">
          <div className="app-surface rounded-2xl px-4 py-4">
            <p className="text-sm font-medium">Новый список</p>
            <input
              value={newListTitle}
              onChange={(event) => setNewListTitle(event.target.value)}
              placeholder="Например: Для дома"
              className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--tg-secondary)',
                color: 'var(--app-text)',
              }}
            />
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newListShared}
                onChange={(event) => setNewListShared(event.target.checked)}
              />
              <span>Общий на двоих (будет код)</span>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCreateList()}
              className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
              style={{
                background: 'var(--tg-button)',
                color: 'var(--tg-button-text)',
              }}
            >
              Создать
            </button>
          </div>

          {data.lists.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
              Пока нет списков
            </p>
          ) : (
            data.lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => {
                  haptic('light');
                  setActiveListId(list.id);
                }}
                className="app-surface w-full rounded-2xl px-4 py-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{list.title}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
                      {listMeta(list)} · {list.items.filter((item) => !item.purchased).length}{' '}
                      осталось
                    </p>
                  </div>
                  {list.isShared && list.shareCode ? (
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide"
                      style={{
                        background:
                          'color-mix(in srgb, var(--tg-button) 14%, transparent)',
                        color: 'var(--tg-button)',
                      }}
                    >
                      {list.shareCode}
                    </span>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="app-surface rounded-2xl px-4 py-4">
            <p className="text-sm font-medium">Присоединиться</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
              Введи код от партнёра — список станет общим на двоих
            </p>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm tracking-[0.2em] outline-none uppercase"
              style={{
                background: 'var(--tg-secondary)',
                color: 'var(--app-text)',
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleJoin()}
              className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
              style={{
                background: 'var(--tg-button)',
                color: 'var(--tg-button-text)',
              }}
            >
              Войти в список
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function ListScreen({
  list,
  busy,
  error,
  userId,
  addMode,
  wbUrl,
  previewTitle,
  previewNote,
  previewImageUrl,
  manualTitle,
  manualNote,
  manualImageUrl,
  manualProductUrl,
  onBack,
  onSetAddMode,
  onSetWbUrl,
  onSetManualTitle,
  onSetManualNote,
  onSetManualImageUrl,
  onSetManualProductUrl,
  onPreviewWb,
  onAddItem,
  onCopyCode,
  onLeave,
  onDelete,
  onToggle,
  onDeleteItem,
}: {
  list: BuyList;
  busy: boolean;
  error: string | null;
  userId: number;
  addMode: 'wb' | 'manual';
  wbUrl: string;
  previewTitle: string;
  previewNote: string;
  previewImageUrl: string;
  manualTitle: string;
  manualNote: string;
  manualImageUrl: string;
  manualProductUrl: string;
  onBack: () => void;
  onSetAddMode: (mode: 'wb' | 'manual') => void;
  onSetWbUrl: (value: string) => void;
  onSetManualTitle: (value: string) => void;
  onSetManualNote: (value: string) => void;
  onSetManualImageUrl: (value: string) => void;
  onSetManualProductUrl: (value: string) => void;
  onPreviewWb: () => void;
  onAddItem: () => void;
  onCopyCode: () => Promise<void>;
  onLeave: () => void;
  onDelete: () => void;
  onToggle: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const pending = list.items.filter((item) => !item.purchased);
  const done = list.items.filter((item) => item.purchased);

  return (
    <div className="mx-auto max-w-md px-4 pt-5 pb-24">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-medium"
        style={{ color: 'var(--tg-button)' }}
      >
        ← Списки
      </button>

      <div className="app-surface rounded-2xl px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-semibold">{list.title}</h1>
            <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
              {listMeta(list)} · {list.members.map((member) => member.label).join(' · ')}
            </p>
          </div>
          {list.isShared && list.shareCode ? (
            <button
              type="button"
              onClick={() => void onCopyCode()}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide"
              style={{
                background: 'color-mix(in srgb, var(--tg-button) 14%, transparent)',
                color: 'var(--tg-button)',
              }}
            >
              {list.shareCode}
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2">
          {list.isOwner ? (
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="rounded-xl px-3 py-2 text-xs disabled:opacity-50"
              style={{ color: 'var(--app-danger)' }}
            >
              Удалить
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onLeave}
              className="rounded-xl px-3 py-2 text-xs disabled:opacity-50"
              style={{ color: 'var(--app-danger)' }}
            >
              Выйти
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p
          className="mt-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--app-danger) 12%, var(--tg-secondary))',
            color: 'var(--app-danger)',
          }}
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 app-surface rounded-2xl px-4 py-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSetAddMode('wb')}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-medium"
            style={{
              background:
                addMode === 'wb'
                  ? 'var(--tg-button)'
                  : 'color-mix(in srgb, var(--tg-button) 12%, transparent)',
              color: addMode === 'wb' ? 'var(--tg-button-text)' : 'var(--tg-button)',
            }}
          >
            Wildberries
          </button>
          <button
            type="button"
            onClick={() => onSetAddMode('manual')}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-medium"
            style={{
              background:
                addMode === 'manual'
                  ? 'var(--tg-button)'
                  : 'color-mix(in srgb, var(--tg-button) 12%, transparent)',
              color:
                addMode === 'manual' ? 'var(--tg-button-text)' : 'var(--tg-button)',
            }}
          >
            Вручную
          </button>
        </div>

        {addMode === 'wb' ? (
          <div className="mt-3 space-y-2">
            <input
              value={wbUrl}
              onChange={(event) => onSetWbUrl(event.target.value)}
              placeholder="Ссылка wildberries.ru"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--tg-secondary)',
                color: 'var(--app-text)',
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={onPreviewWb}
              className="w-full rounded-xl px-3 py-2.5 text-sm disabled:opacity-50"
              style={{
                background: 'color-mix(in srgb, var(--tg-button) 12%, transparent)',
                color: 'var(--tg-button)',
              }}
            >
              Проверить
            </button>
            {previewTitle ? (
              <PreviewCard
                title={previewTitle}
                note={previewNote}
                imageUrl={previewImageUrl}
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <input
              value={manualTitle}
              onChange={(event) => onSetManualTitle(event.target.value)}
              placeholder="Название"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--tg-secondary)',
                color: 'var(--app-text)',
              }}
            />
            <input
              value={manualNote}
              onChange={(event) => onSetManualNote(event.target.value)}
              placeholder="Пояснение"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--tg-secondary)',
                color: 'var(--app-text)',
              }}
            />
            <input
              value={manualImageUrl}
              onChange={(event) => onSetManualImageUrl(event.target.value)}
              placeholder="Ссылка на фото"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--tg-secondary)',
                color: 'var(--app-text)',
              }}
            />
            <input
              value={manualProductUrl}
              onChange={(event) => onSetManualProductUrl(event.target.value)}
              placeholder="Ссылка на товар (необязательно)"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--tg-secondary)',
                color: 'var(--app-text)',
              }}
            />
          </div>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={onAddItem}
          className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
          style={{
            background: 'var(--tg-button)',
            color: 'var(--tg-button-text)',
          }}
        >
          Добавить
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {pending.length === 0 && done.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            Список пустой
          </p>
        ) : null}
        {pending.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            userId={userId}
            busy={busy}
            onToggle={() => onToggle(item.id)}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
        {done.length > 0 ? (
          <p className="pt-2 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--tg-hint)' }}>
            Куплено
          </p>
        ) : null}
        {done.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            userId={userId}
            busy={busy}
            onToggle={() => onToggle(item.id)}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PreviewCard({
  title,
  note,
  imageUrl,
}: {
  title: string;
  note: string;
  imageUrl: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl p-3" style={{ background: 'var(--tg-secondary)' }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : null}
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {note ? (
          <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  userId,
  busy,
  onToggle,
  onDelete,
}: {
  item: BuyListItem;
  userId: number;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="app-surface rounded-2xl px-4 py-4"
      style={{
        opacity: item.purchased ? 0.72 : 1,
      }}
    >
      <div className="flex gap-3">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-xs"
            style={{
              background: 'var(--tg-secondary)',
              color: 'var(--tg-hint)',
            }}
          >
            WB
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="font-medium"
            style={{
              textDecoration: item.purchased ? 'line-through' : 'none',
            }}
          >
            {item.title}
          </p>
          {item.note ? (
            <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
              {item.note}
            </p>
          ) : null}
          <p className="mt-1 text-[11px]" style={{ color: 'var(--tg-hint)' }}>
            {item.addedById === userId ? 'Ты' : item.addedByLabel}
            {item.source === 'wildberries' ? ' · WB' : ''}
          </p>
          {item.productUrl ? (
            <button
              type="button"
              onClick={() => openUrl(item.productUrl)}
              className="mt-2 text-xs font-medium"
              style={{ color: 'var(--app-link)' }}
            >
              Открыть
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          className="flex-1 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
          style={{
            background: item.purchased
              ? 'color-mix(in srgb, var(--tg-hint) 12%, transparent)'
              : 'color-mix(in srgb, var(--app-link) 14%, transparent)',
            color: item.purchased ? 'var(--tg-hint)' : 'var(--app-link)',
          }}
        >
          {item.purchased ? 'Вернуть' : 'Купили'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded-xl px-3 py-2 text-sm disabled:opacity-50"
          style={{ color: 'var(--app-danger)' }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
