import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Intake, type Medication } from '../api/client';
import { CustomCheckbox } from '../components/CustomCheckbox';
import { CustomDateField } from '../components/CustomDateField';
import { CustomSelect } from '../components/CustomSelect';
import { useTelegram } from '../telegram/TelegramProvider';

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function dayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayTitle(key: string) {
  const date = new Date(`${key}T12:00:00`);
  const today = dayKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayKey(yesterdayDate);

  if (key === today) {
    return 'Сегодня';
  }
  if (key === yesterday) {
    return 'Вчера';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function HistoryScreen() {
  const { initData, haptic } = useTelegram();
  const [items, setItems] = useState<Intake[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [medicationId, setMedicationId] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const medOptions = useMemo(
    () => [
      { id: '', label: 'Все препараты' },
      ...meds.map((med) => ({ id: med.id, label: med.name })),
    ],
    [meds],
  );

  const groupedDays = useMemo(() => {
    const map = new Map<string, Intake[]>();
    for (const item of items) {
      const key = dayKey(item.takenAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }

    return Array.from(map.entries()).map(([key, dayItems]) => ({
      key,
      title: formatDayTitle(key),
      items: dayItems.sort(
        (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime(),
      ),
    }));
  }, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, overview] = await Promise.all([
        api.history(initData, {
          from: from || undefined,
          to: to || undefined,
          medicationId: medicationId || undefined,
          onlyDeleted: showDeleted || undefined,
        }),
        api.overview(initData),
      ]);
      setItems(data);
      setMeds(overview.medications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [initData, from, to, medicationId, showDeleted]);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeOne(id: string) {
    setBusy(true);
    setStatus(null);
    haptic('medium');
    try {
      await api.deleteIntake(initData, id);
      setStatus('Запись скрыта. Можно вернуть во вкладке удалённых.');
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setBusy(false);
    }
  }

  async function restoreOne(id: string) {
    setBusy(true);
    setStatus(null);
    haptic('medium');
    try {
      await api.restoreIntake(initData, id);
      setStatus('Запись восстановлена');
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка восстановления');
    } finally {
      setBusy(false);
    }
  }

  async function clearPeriod() {
    if (!from && !to) {
      setStatus('Укажи период (от и/или до)');
      return;
    }
    setBusy(true);
    setStatus(null);
    haptic('heavy');
    try {
      const result = await api.clearHistory(initData, {
        from: from || undefined,
        to: to || undefined,
      });
      setStatus(`Скрыто записей за период: ${result.deleted}`);
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка очистки');
    } finally {
      setBusy(false);
    }
  }

  async function purgeDeleted() {
    setBusy(true);
    setStatus(null);
    haptic('heavy');
    try {
      const result = await api.purgeDeleted(initData);
      setStatus(`Окончательно удалено: ${result.deleted}`);
      setItems([]);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка очистки');
    } finally {
      setBusy(false);
    }
  }

  function resetFilter() {
    setFrom('');
    setTo('');
    setMedicationId('');
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">История приёма</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--tg-hint)' }}>
          Фильтры по дате и препарату, мягкое удаление.
        </p>
      </div>

      <section
        className="space-y-3 rounded-3xl px-5 py-4"
        style={{ background: 'var(--tg-secondary)' }}
      >
        <p className="text-sm font-medium">Фильтры</p>
        <div className="grid grid-cols-2 gap-2">
          <CustomDateField label="От" value={from} onChange={setFrom} />
          <CustomDateField label="До" value={to} onChange={setTo} />
        </div>

        <div>
          <CustomSelect
            label="Препарат"
            options={medOptions}
            value={medicationId}
            onChange={setMedicationId}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton disabled={busy} onClick={() => void load()}>
            Применить
          </ActionButton>
          <ActionButton disabled={busy} onClick={resetFilter} secondary>
            Сбросить
          </ActionButton>
        </div>

        <CustomCheckbox
          checked={showDeleted}
          onChange={setShowDeleted}
          label="Показать удалённые"
        />
      </section>

      {!showDeleted ? (
        <section
          className="space-y-2 rounded-3xl px-5 py-4"
          style={{ background: 'var(--tg-secondary)' }}
        >
          <p className="text-sm font-medium">Удаление за период</p>
          <ActionButton disabled={busy} onClick={() => void clearPeriod()} danger>
            Удалить за период
          </ActionButton>
        </section>
      ) : (
        <section
          className="space-y-2 rounded-3xl px-5 py-4"
          style={{ background: 'var(--tg-secondary)' }}
        >
          <p className="text-sm font-medium">Окончательное удаление</p>
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            Удалит все записи из корзины без восстановления.
          </p>
          <ActionButton disabled={busy} onClick={() => void purgeDeleted()} danger>
            Почистить удалённые
          </ActionButton>
        </section>
      )}

      {status ? (
        <p
          className="rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--tg-button) 14%, transparent)',
          }}
        >
          {status}
        </p>
      ) : null}

      {loading ? (
        <div className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          Загрузка истории...
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-3xl px-5 py-5"
          style={{ background: 'var(--tg-secondary)' }}
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          {showDeleted
            ? 'Удалённых записей нет.'
            : 'Записей нет. Измени фильтр или отметь приём на главной.'}
        </p>
      ) : null}

      {!loading && groupedDays.length > 0 ? (
        <div className="space-y-4">
          {groupedDays.map((group) => (
            <section
              key={group.key}
              className="overflow-hidden rounded-3xl"
              style={{ background: 'var(--tg-secondary)' }}
            >
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{
                  borderBottom:
                    '1px solid color-mix(in srgb, var(--tg-hint) 18%, transparent)',
                }}
              >
                <h2 className="font-display text-base font-semibold capitalize">
                  {group.title}
                </h2>
                <span className="text-xs font-medium" style={{ color: 'var(--tg-hint)' }}>
                  {group.items.length}{' '}
                  {group.items.length === 1
                    ? 'запись'
                    : group.items.length < 5
                      ? 'записи'
                      : 'записей'}
                </span>
              </div>

              <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--tg-hint) 14%, transparent)' }}>
                {group.items.map((item) => (
                  <article
                    key={item.id}
                    className="px-5 py-4"
                    style={{ opacity: item.isDeleted ? 0.72 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{item.medicationName}</h3>
                          <span
                            className="rounded-lg px-2 py-0.5 text-xs font-semibold"
                            style={{
                              background:
                                'color-mix(in srgb, var(--tg-button) 12%, transparent)',
                              color: 'var(--tg-button)',
                            }}
                          >
                            {formatTime(item.takenAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm" style={{ color: 'var(--tg-hint)' }}>
                          {item.tabletsCount} шт × {item.mgPerTablet} мг ·{' '}
                          {item.totalMg} мг
                          {item.isDeleted ? ' · удалено' : ''}
                        </p>
                      </div>
                      {item.isDeleted ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void restoreOne(item.id)}
                          className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
                          style={{
                            background: 'var(--tg-button)',
                            color: 'var(--tg-button-text)',
                          }}
                        >
                          Вернуть
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeOne(item.id)}
                          className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
                          style={{
                            background:
                              'color-mix(in srgb, #b42318 16%, transparent)',
                            color: '#b42318',
                          }}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  secondary,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
      style={{
        background: danger
          ? 'color-mix(in srgb, #b42318 16%, transparent)'
          : secondary
            ? 'color-mix(in srgb, var(--tg-hint) 14%, transparent)'
            : 'var(--tg-button)',
        color: danger
          ? '#b42318'
          : secondary
            ? 'var(--tg-text)'
            : 'var(--tg-button-text)',
      }}
    >
      {children}
    </button>
  );
}
