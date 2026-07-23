import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  mediaUrl,
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
  if (list.isShared && list.shareCode) {
    const guests = list.members.filter((member) => member.role === 'member').length;
    return guests > 0 ? `Общий · ${list.members.length} чел.` : 'Общий · код активен';
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
  const [itemTitle, setItemTitle] = useState('');
  const [itemNote, setItemNote] = useState('');
  const [itemProductUrl, setItemProductUrl] = useState('');
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState('');
  const [listTab, setListTab] = useState<'items' | 'add' | 'more'>('items');

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

  useEffect(() => {
    return () => {
      if (itemImagePreview) {
        URL.revokeObjectURL(itemImagePreview);
      }
    };
  }, [itemImagePreview]);

  function clearItemForm() {
    setItemTitle('');
    setItemNote('');
    setItemProductUrl('');
    setItemImage(null);
    setItemImagePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return '';
    });
  }

  function handlePickImage(file: File | null) {
    setItemImagePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return file ? URL.createObjectURL(file) : '';
    });
    setItemImage(file);
  }

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

  async function handleAddItem() {
    if (!activeList) {
      return;
    }
    const title = itemTitle.trim();
    if (!title) {
      setError('Укажи название');
      return;
    }
    await runAction(() =>
      api.buyAddItem(initData, {
        listId: activeList.id,
        title,
        note: itemNote.trim() || undefined,
        productUrl: normalizeUrl(itemProductUrl) || undefined,
        image: itemImage,
      }),
    );
    clearItemForm();
    setListTab('items');
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
        tab={listTab}
        onTabChange={setListTab}
        itemTitle={itemTitle}
        itemNote={itemNote}
        itemProductUrl={itemProductUrl}
        itemImagePreview={itemImagePreview}
        onBack={() => {
          setActiveListId(null);
          setListTab('items');
          clearItemForm();
        }}
        onSetItemTitle={setItemTitle}
        onSetItemNote={setItemNote}
        onSetItemProductUrl={setItemProductUrl}
        onPickImage={handlePickImage}
        onClearImage={() => handlePickImage(null)}
        onAddItem={() => void handleAddItem()}
        onCopyCode={async () => {
          if (!activeList.shareCode) {
            return;
          }
          await copyText(activeList.shareCode);
          haptic('light');
        }}
        onEnableSharing={() =>
          void runAction(() => api.buyEnableSharing(initData, activeList.id))
        }
        onRemoveMember={(memberUserId) =>
          void runAction(() =>
            api.buyRemoveMember(initData, {
              listId: activeList.id,
              memberUserId,
            }),
          )
        }
        onLeave={() =>
          void runAction(() => api.buyLeaveList(initData, activeList.id)).then(
            () => {
              setActiveListId(null);
              setListTab('items');
            },
          )
        }
        onDelete={() =>
          void runAction(() => api.buyDeleteList(initData, activeList.id)).then(
            () => {
              setActiveListId(null);
              setListTab('items');
            },
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
          Покупки
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          Что нужно
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--tg-hint)' }}>
          Личные списки или общие по коду
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
              <span>Сразу выдать код доступа</span>
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
              Введи код — попадёшь в общий список
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
  tab,
  onTabChange,
  itemTitle,
  itemNote,
  itemProductUrl,
  itemImagePreview,
  onBack,
  onSetItemTitle,
  onSetItemNote,
  onSetItemProductUrl,
  onPickImage,
  onClearImage,
  onAddItem,
  onCopyCode,
  onEnableSharing,
  onRemoveMember,
  onLeave,
  onDelete,
  onToggle,
  onDeleteItem,
}: {
  list: BuyList;
  busy: boolean;
  error: string | null;
  userId: number;
  tab: 'items' | 'add' | 'more';
  onTabChange: (tab: 'items' | 'add' | 'more') => void;
  itemTitle: string;
  itemNote: string;
  itemProductUrl: string;
  itemImagePreview: string;
  onBack: () => void;
  onSetItemTitle: (value: string) => void;
  onSetItemNote: (value: string) => void;
  onSetItemProductUrl: (value: string) => void;
  onPickImage: (file: File | null) => void;
  onClearImage: () => void;
  onAddItem: () => void;
  onCopyCode: () => Promise<void>;
  onEnableSharing: () => void;
  onRemoveMember: (memberUserId: number) => void;
  onLeave: () => void;
  onDelete: () => void;
  onToggle: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const pending = list.items.filter((item) => !item.purchased);
  const done = list.items.filter((item) => item.purchased);
  const guests = list.members.filter((member) => member.role === 'member');
  const listTabs = [
    { id: 'items' as const, label: 'Список' },
    { id: 'add' as const, label: 'Добавить' },
    { id: 'more' as const, label: 'Ещё' },
  ];

  return (
    <Shell tab={tab} onTabChange={onTabChange} tabs={listTabs}>
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
              {listMeta(list)} · {pending.length} осталось
            </p>
          </div>
          {list.shareCode ? (
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

      {tab === 'items' ? (
        <div className="mt-4 space-y-3">
          {pending.length === 0 && done.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
              Список пустой — добавь товар во вкладке «Добавить»
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
            <p
              className="pt-2 text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--tg-hint)' }}
            >
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
      ) : null}

      {tab === 'add' ? (
        <div className="mt-4 app-surface rounded-2xl px-4 py-4 space-y-2">
          <input
            value={itemTitle}
            onChange={(event) => onSetItemTitle(event.target.value)}
            placeholder="Название"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--tg-secondary)',
              color: 'var(--app-text)',
            }}
          />
          <input
            value={itemNote}
            onChange={(event) => onSetItemNote(event.target.value)}
            placeholder="Пояснение"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--tg-secondary)',
              color: 'var(--app-text)',
            }}
          />
          <input
            value={itemProductUrl}
            onChange={(event) => onSetItemProductUrl(event.target.value)}
            placeholder="Ссылка на товар (необязательно)"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--tg-secondary)',
              color: 'var(--app-text)',
            }}
          />

          <div
            className="rounded-xl px-3 py-3"
            style={{ background: 'var(--tg-secondary)' }}
          >
            <p className="text-sm font-medium">Фото</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
              Сделай снимок или выбери из галереи
            </p>
            <label className="mt-3 block">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="block w-full text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  onPickImage(file);
                  event.target.value = '';
                }}
              />
            </label>
            {itemImagePreview ? (
              <div className="mt-3 flex items-start gap-3">
                <img
                  src={itemImagePreview}
                  alt=""
                  className="h-24 w-24 rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={onClearImage}
                  className="rounded-xl px-3 py-2 text-xs"
                  style={{ color: 'var(--app-danger)' }}
                >
                  Убрать фото
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onAddItem}
            className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
            style={{
              background: 'var(--tg-button)',
              color: 'var(--tg-button-text)',
            }}
          >
            Добавить в список
          </button>
        </div>
      ) : null}

      {tab === 'more' ? (
        <div className="mt-4 space-y-3">
          <div className="app-surface rounded-2xl px-4 py-4">
            {list.isOwner && !list.shareCode ? (
              <button
                type="button"
                disabled={busy}
                onClick={onEnableSharing}
                className="w-full rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{
                  background: 'color-mix(in srgb, var(--tg-button) 12%, transparent)',
                  color: 'var(--tg-button)',
                }}
              >
                Выдать код доступа
              </button>
            ) : null}

            {list.shareCode ? (
              <div>
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--tg-hint)' }}
                >
                  Код доступа
                </p>
                <button
                  type="button"
                  onClick={() => void onCopyCode()}
                  className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm font-semibold tracking-[0.2em]"
                  style={{
                    background: 'var(--tg-secondary)',
                    color: 'var(--tg-button)',
                  }}
                >
                  {list.shareCode}
                </button>
              </div>
            ) : null}

            {list.isOwner ? (
              <div
                className="mt-3 space-y-2 border-t pt-3"
                style={{ borderColor: 'var(--app-border)' }}
              >
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--tg-hint)' }}
                >
                  Участники
                </p>
                {list.members.map((member) => (
                  <div
                    key={`${member.role}-${member.userId}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm">{member.label}</p>
                      <p className="text-[11px]" style={{ color: 'var(--tg-hint)' }}>
                        {member.role === 'owner' ? 'Создатель' : 'По коду'}
                      </p>
                    </div>
                    {member.role === 'member' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onRemoveMember(member.userId)}
                        className="rounded-xl px-3 py-1.5 text-xs disabled:opacity-50"
                        style={{ color: 'var(--app-danger)' }}
                      >
                        Удалить
                      </button>
                    ) : null}
                  </div>
                ))}
                {guests.length === 0 && list.shareCode ? (
                  <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                    Пока никто не присоединился
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs" style={{ color: 'var(--tg-hint)' }}>
                {list.members.map((member) => member.label).join(' · ')}
              </p>
            )}

            <div
              className="mt-3 flex gap-2 border-t pt-3"
              style={{ borderColor: 'var(--app-border)' }}
            >
              {list.isOwner ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDelete}
                  className="rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                  style={{ color: 'var(--app-danger)' }}
                >
                  Удалить список
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onLeave}
                  className="rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                  style={{ color: 'var(--app-danger)' }}
                >
                  Выйти из списка
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
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
  const image = mediaUrl(item.imageUrl);

  return (
    <div
      className="app-surface rounded-2xl px-4 py-4"
      style={{
        opacity: item.purchased ? 0.72 : 1,
      }}
    >
      <div className="flex gap-3">
        {image ? (
          <img
            src={image}
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
            Фото
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
