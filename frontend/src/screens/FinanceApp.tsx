import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type FinanceDebt,
  type FinanceOverview,
  type FinanceProvider,
} from '../api/client';
import { Shell } from '../components/Shell';
import { useTelegram } from '../telegram/TelegramProvider';

type FinanceAppProps = {
  onBack: () => void;
};

type Tab = 'overview' | 'banks' | 'cash' | 'debts';

const tabs = [
  { id: 'overview' as const, label: 'Обзор' },
  { id: 'banks' as const, label: 'Банки' },
  { id: 'cash' as const, label: 'Наличные' },
  { id: 'debts' as const, label: 'Долги' },
];

function formatMoney(amount: number, currency: string) {
  return (
    new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currency}`
  );
}

function formatWhen(value: string | null) {
  if (!value) {
    return 'ещё не синхронизировалось';
  }
  return new Date(value).toLocaleString('ru-RU');
}

function debtDirectionLabel(direction: FinanceDebt['direction']) {
  return direction === 'i_owe' ? 'Я должен' : 'Мне должны';
}

function readAlphaNotice() {
  if (typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const status = params.get('alpha');
  if (!status) {
    return null;
  }
  const message = params.get('alphaMessage');
  if (status === 'connected') {
    return { type: 'success' as const, text: 'Альфа-Банк подключён' };
  }
  return {
    type: 'error' as const,
    text: message ?? 'Не удалось подключить Альфа-Банк',
  };
}

export function FinanceApp({ onBack }: FinanceAppProps) {
  const { initData, haptic } = useTelegram();
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    readAlphaNotice,
  );
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const overview = await api.financeOverview(initData);
    setData(overview);
    return overview;
  }, [initData]);

  useEffect(() => {
    let alive = true;
    load().catch((err: Error) => {
      if (alive) {
        setError(err.message);
      }
    });
    return () => {
      alive = false;
    };
  }, [load]);

  useEffect(() => {
    const current = readAlphaNotice();
    if (!current) {
      return;
    }
    setNotice(current);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('alpha');
      url.searchParams.delete('alphaMessage');
      window.history.replaceState({}, '', url.toString());
    }
    if (current.type === 'success') {
      void load();
    }
  }, [load]);

  async function runAction(action: () => Promise<FinanceOverview>) {
    setBusy(true);
    setError(null);
    haptic('medium');
    try {
      const overview = await action();
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  async function connectAlpha() {
    setBusy(true);
    setError(null);
    haptic('medium');
    try {
      const result = await api.financeAlphaConnect(initData);
      const opener = window.Telegram?.WebApp?.openLink;
      if (opener) {
        opener(result.authUrl);
      } else {
        window.location.href = result.authUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка подключения');
    } finally {
      setBusy(false);
    }
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
          Финансы
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          Все деньги
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--tg-hint)' }}>
          Балансы подтягиваются из банков автоматически
        </p>
      </div>

      {notice ? (
        <p
          className="mt-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background:
              notice.type === 'success'
                ? 'color-mix(in srgb, var(--app-link) 12%, var(--tg-secondary))'
                : 'color-mix(in srgb, var(--app-danger) 12%, var(--tg-secondary))',
            color: notice.type === 'success' ? 'var(--app-link)' : 'var(--app-danger)',
          }}
        >
          {notice.text}
        </p>
      ) : null}

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

      {tab === 'overview' ? <OverviewTab data={data} /> : null}
      {tab === 'banks' ? (
        <BanksTab
          data={data}
          busy={busy}
          onConnectAlpha={() => void connectAlpha()}
          onSyncAlpha={() => runAction(() => api.financeAlphaSync(initData))}
          onDisconnectAlpha={() =>
            runAction(() => api.financeAlphaDisconnect(initData))
          }
        />
      ) : null}
      {tab === 'cash' ? (
        <CashTab
          data={data}
          busy={busy}
          onSetCash={(currency, amount) =>
            runAction(() => api.financeSetCash(initData, { currency, amount }))
          }
          onDeleteCash={(currency) =>
            runAction(() => api.financeDeleteCash(initData, currency))
          }
        />
      ) : null}
      {tab === 'debts' ? (
        <DebtsTab
          data={data}
          busy={busy}
          onCreateDebt={(payload) =>
            runAction(() => api.financeCreateDebt(initData, payload))
          }
          onUpdateDebt={(payload) =>
            runAction(() => api.financeUpdateDebt(initData, payload))
          }
          onDeleteDebt={(debtId) =>
            runAction(() => api.financeDeleteDebt(initData, debtId))
          }
        />
      ) : null}
    </Shell>
  );
}

function OverviewTab({ data }: { data: FinanceOverview }) {
  const debtsOwe = data.debts.filter((d) => d.direction === 'i_owe');
  const debtsOwed = data.debts.filter((d) => d.direction === 'owed_to_me');

  return (
    <div className="mt-5 space-y-4">
      <section>
        <h2 className="font-display text-lg font-semibold">Итого по валютам</h2>
        {data.totals.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: 'var(--tg-hint)' }}>
            Подключи Альфа-Банк на вкладке «Банки»
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.totals.map((total) => (
              <div key={total.currency} className="app-surface rounded-2xl px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                    {total.currency}
                  </span>
                  <span className="font-display text-xl font-semibold">
                    {formatMoney(total.grandTotal, total.currency)}
                  </span>
                </div>
                <div
                  className="mt-2 grid grid-cols-2 gap-2 text-xs"
                  style={{ color: 'var(--tg-hint)' }}
                >
                  <span>Банки: {formatMoney(total.accountsTotal, total.currency)}</span>
                  <span>Наличные: {formatMoney(total.cashTotal, total.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Банки и сервисы</h2>
        <div className="mt-3 space-y-2">
          {data.accounts.map((account) => (
            <div key={account.id} className="app-surface rounded-2xl px-4 py-3">
              <p className="font-medium">{account.name}</p>
              {account.balances.length === 0 ? (
                <p className="mt-1 text-sm" style={{ color: 'var(--tg-hint)' }}>
                  Нет данных
                </p>
              ) : (
                <div className="mt-2 space-y-1">
                  {account.balances.map((balance) => (
                    <div key={balance.currency} className="flex justify-between text-sm">
                      <span style={{ color: 'var(--tg-hint)' }}>{balance.currency}</span>
                      <span className="font-medium">
                        {formatMoney(balance.amount, balance.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {data.cash.length > 0 ? (
        <section>
          <h2 className="font-display text-lg font-semibold">Наличные</h2>
          <div className="mt-3 space-y-2">
            {data.cash.map((entry) => (
              <div
                key={entry.currency}
                className="app-surface flex items-center justify-between rounded-2xl px-4 py-3"
              >
                <span style={{ color: 'var(--tg-hint)' }}>{entry.currency}</span>
                <span className="font-semibold">
                  {formatMoney(entry.amount, entry.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-lg font-semibold">Долги</h2>
        {data.debts.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: 'var(--tg-hint)' }}>
            Долгов пока нет
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {debtsOwe.length > 0 ? (
              <DebtGroup title="Я должен" debts={debtsOwe} tone="danger" />
            ) : null}
            {debtsOwed.length > 0 ? (
              <DebtGroup title="Мне должны" debts={debtsOwed} tone="accent" />
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function BanksTab({
  data,
  busy,
  onConnectAlpha,
  onSyncAlpha,
  onDisconnectAlpha,
}: {
  data: FinanceOverview;
  busy: boolean;
  onConnectAlpha: () => void;
  onSyncAlpha: () => Promise<void>;
  onDisconnectAlpha: () => Promise<void>;
}) {
  return (
    <div className="mt-5 space-y-3">
      {data.providers.map((provider) => (
        <ProviderCard
          key={provider.key}
          provider={provider}
          busy={busy}
          onConnect={provider.key === 'alpha' ? onConnectAlpha : undefined}
          onSync={provider.key === 'alpha' ? onSyncAlpha : undefined}
          onDisconnect={provider.key === 'alpha' ? onDisconnectAlpha : undefined}
        />
      ))}
    </div>
  );
}

function ProviderCard({
  provider,
  busy,
  onConnect,
  onSync,
  onDisconnect,
}: {
  provider: FinanceProvider;
  busy: boolean;
  onConnect?: () => void;
  onSync?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
}) {
  const isAlpha = provider.key === 'alpha';

  return (
    <div className="app-surface rounded-2xl px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{provider.name}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
            {provider.connected
              ? `Подключено · ${formatWhen(provider.lastSyncAt)}`
              : isAlpha
                ? provider.integrationReady
                  ? 'Не подключено'
                  : 'Нужны ключи ALPHA_CLIENT_ID / ALPHA_CLIENT_SECRET на сервере'
                : 'Интеграция скоро'}
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: provider.connected
              ? 'color-mix(in srgb, var(--app-link) 14%, transparent)'
              : 'color-mix(in srgb, var(--tg-hint) 12%, transparent)',
            color: provider.connected ? 'var(--app-link)' : 'var(--tg-hint)',
          }}
        >
          {provider.connected ? 'ON' : 'OFF'}
        </span>
      </div>

      {provider.lastSyncError ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--app-danger)' }}>
          {provider.lastSyncError}
        </p>
      ) : null}

      {provider.products.length > 0 ? (
        <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'var(--app-border)' }}>
          {provider.products.map((product) => (
            <div key={`${product.id}-${product.currency}`} className="flex justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate">{product.name}</p>
                {product.maskedNumber ? (
                  <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                    {product.maskedNumber}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 font-medium">
                {formatMoney(product.amount, product.currency)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {isAlpha && provider.integrationReady ? (
        <div className="mt-3 flex gap-2">
          {!provider.connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={onConnect}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
              style={{
                background: 'var(--tg-button)',
                color: 'var(--tg-button-text)',
              }}
            >
              Подключить
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSync?.()}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{
                  background: 'color-mix(in srgb, var(--tg-button) 14%, transparent)',
                  color: 'var(--tg-button)',
                }}
              >
                Обновить
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onDisconnect?.()}
                className="rounded-xl px-3 py-2.5 text-sm disabled:opacity-50"
                style={{ color: 'var(--app-danger)' }}
              >
                Отключить
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DebtGroup({
  title,
  debts,
  tone,
}: {
  title: string;
  debts: FinanceDebt[];
  tone: 'danger' | 'accent';
}) {
  return (
    <div>
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: tone === 'danger' ? 'var(--app-danger)' : 'var(--app-link)' }}
      >
        {title}
      </p>
      <div className="mt-2 space-y-2">
        {debts.map((debt) => (
          <div key={debt.id} className="app-surface rounded-2xl px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{debt.personName}</p>
                {debt.note ? (
                  <p className="mt-1 text-sm" style={{ color: 'var(--tg-hint)' }}>
                    {debt.note}
                  </p>
                ) : null}
              </div>
              <span
                className="shrink-0 font-semibold"
                style={{
                  color: tone === 'danger' ? 'var(--app-danger)' : 'var(--app-link)',
                }}
              >
                {formatMoney(debt.amount, debt.currency)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashTab({
  data,
  busy,
  onSetCash,
  onDeleteCash,
}: {
  data: FinanceOverview;
  busy: boolean;
  onSetCash: (currency: string, amount: number) => Promise<void>;
  onDeleteCash: (currency: string) => Promise<void>;
}) {
  const [currency, setCurrency] = useState(data.currencies[0] ?? 'BYN');
  const [amount, setAmount] = useState('');

  return (
    <div className="mt-5 space-y-3">
      <div className="app-surface rounded-2xl px-4 py-4">
        <p className="text-sm font-medium">Наличные</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
          Только наличные вводятся вручную
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="app-input rounded-xl px-3 py-2.5 text-sm"
          >
            {data.currencies.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Сумма"
            className="app-input rounded-xl px-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={busy || !amount.trim()}
          onClick={() => {
            const parsed = Number(amount.replace(',', '.'));
            if (!Number.isFinite(parsed)) {
              return;
            }
            setAmount('');
            void onSetCash(currency, parsed);
          }}
          className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
          style={{
            background: 'var(--tg-button)',
            color: 'var(--tg-button-text)',
          }}
        >
          Сохранить
        </button>
      </div>

      {data.cash.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          Наличных пока нет
        </p>
      ) : (
        data.cash.map((entry) => (
          <div
            key={entry.currency}
            className="app-surface flex items-center justify-between rounded-2xl px-4 py-3"
          >
            <div>
              <p className="font-medium">{entry.currency}</p>
              <p className="text-sm font-semibold">
                {formatMoney(entry.amount, entry.currency)}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDeleteCash(entry.currency)}
              className="rounded-lg px-2 py-1 text-xs"
              style={{ color: 'var(--app-danger)' }}
            >
              Удалить
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function DebtsTab({
  data,
  busy,
  onCreateDebt,
  onUpdateDebt,
  onDeleteDebt,
}: {
  data: FinanceOverview;
  busy: boolean;
  onCreateDebt: (payload: {
    personName: string;
    amount: number;
    currency: string;
    direction: 'i_owe' | 'owed_to_me';
    note?: string;
  }) => Promise<void>;
  onUpdateDebt: (payload: {
    debtId: string;
    personName?: string;
    amount?: number;
    currency?: string;
    direction?: 'i_owe' | 'owed_to_me';
    note?: string;
  }) => Promise<void>;
  onDeleteDebt: (debtId: string) => Promise<void>;
}) {
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(data.currencies[0] ?? 'BYN');
  const [direction, setDirection] = useState<'i_owe' | 'owed_to_me'>('i_owe');
  const [note, setNote] = useState('');

  return (
    <div className="mt-5 space-y-3">
      <div className="app-surface rounded-2xl px-4 py-4">
        <p className="text-sm font-medium">Новый долг</p>
        <div className="mt-3 space-y-2">
          <input
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="Кто"
            className="app-input w-full rounded-xl px-3 py-2.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Сумма"
              className="app-input rounded-xl px-3 py-2.5 text-sm"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="app-input rounded-xl px-3 py-2.5 text-sm"
            >
              {data.currencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('i_owe')}
              className="rounded-xl px-3 py-2.5 text-sm font-medium"
              style={{
                background:
                  direction === 'i_owe'
                    ? 'color-mix(in srgb, var(--app-danger) 16%, transparent)'
                    : 'color-mix(in srgb, var(--tg-hint) 12%, transparent)',
                color: direction === 'i_owe' ? 'var(--app-danger)' : 'var(--tg-text)',
              }}
            >
              Я должен
            </button>
            <button
              type="button"
              onClick={() => setDirection('owed_to_me')}
              className="rounded-xl px-3 py-2.5 text-sm font-medium"
              style={{
                background:
                  direction === 'owed_to_me'
                    ? 'color-mix(in srgb, var(--app-link) 16%, transparent)'
                    : 'color-mix(in srgb, var(--tg-hint) 12%, transparent)',
                color: direction === 'owed_to_me' ? 'var(--app-link)' : 'var(--tg-text)',
              }}
            >
              Мне должны
            </button>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Заметка (необязательно)"
            className="app-input w-full rounded-xl px-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={busy || !personName.trim() || !amount.trim()}
          onClick={() => {
            const parsed = Number(amount.replace(',', '.'));
            if (!Number.isFinite(parsed)) {
              return;
            }
            setPersonName('');
            setAmount('');
            setNote('');
            void onCreateDebt({
              personName: personName.trim(),
              amount: parsed,
              currency,
              direction,
              note: note.trim() || undefined,
            });
          }}
          className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
          style={{
            background: 'var(--tg-button)',
            color: 'var(--tg-button-text)',
          }}
        >
          Добавить
        </button>
      </div>

      {data.debts.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          Долгов пока нет
        </p>
      ) : (
        data.debts.map((debt) => (
          <DebtEditor
            key={debt.id}
            debt={debt}
            currencies={data.currencies}
            busy={busy}
            onUpdate={onUpdateDebt}
            onDelete={onDeleteDebt}
          />
        ))
      )}
    </div>
  );
}

function DebtEditor({
  debt,
  currencies,
  busy,
  onUpdate,
  onDelete,
}: {
  debt: FinanceDebt;
  currencies: string[];
  busy: boolean;
  onUpdate: (payload: {
    debtId: string;
    personName?: string;
    amount?: number;
    currency?: string;
    direction?: 'i_owe' | 'owed_to_me';
    note?: string;
  }) => Promise<void>;
  onDelete: (debtId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [personName, setPersonName] = useState(debt.personName);
  const [amount, setAmount] = useState(String(debt.amount));
  const [currency, setCurrency] = useState(debt.currency);
  const [direction, setDirection] = useState(debt.direction);
  const [note, setNote] = useState(debt.note);

  return (
    <div className="app-surface rounded-2xl px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{debt.personName}</p>
          <p
            className="mt-1 text-sm font-semibold"
            style={{
              color:
                debt.direction === 'i_owe' ? 'var(--app-danger)' : 'var(--app-link)',
            }}
          >
            {formatMoney(debt.amount, debt.currency)}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
            {debtDirectionLabel(debt.direction)}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg px-2 py-1 text-xs"
            style={{ color: 'var(--tg-hint)' }}
          >
            {open ? '▲' : '▼'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete(debt.id)}
            className="rounded-lg px-2 py-1 text-xs"
            style={{ color: 'var(--app-danger)' }}
          >
            ✕
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'var(--app-border)' }}>
          <input
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            className="app-input w-full rounded-xl px-3 py-2.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="app-input rounded-xl px-3 py-2.5 text-sm"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="app-input rounded-xl px-3 py-2.5 text-sm"
            >
              {currencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('i_owe')}
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background:
                  direction === 'i_owe'
                    ? 'color-mix(in srgb, var(--app-danger) 16%, transparent)'
                    : 'color-mix(in srgb, var(--tg-hint) 12%, transparent)',
                color: direction === 'i_owe' ? 'var(--app-danger)' : 'var(--tg-text)',
              }}
            >
              Я должен
            </button>
            <button
              type="button"
              onClick={() => setDirection('owed_to_me')}
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background:
                  direction === 'owed_to_me'
                    ? 'color-mix(in srgb, var(--app-link) 16%, transparent)'
                    : 'color-mix(in srgb, var(--tg-hint) 12%, transparent)',
                color: direction === 'owed_to_me' ? 'var(--app-link)' : 'var(--tg-text)',
              }}
            >
              Мне должны
            </button>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Заметка"
            className="app-input w-full rounded-xl px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            disabled={busy || !personName.trim() || !amount.trim()}
            onClick={() => {
              const parsed = Number(amount.replace(',', '.'));
              if (!Number.isFinite(parsed)) {
                return;
              }
              setOpen(false);
              void onUpdate({
                debtId: debt.id,
                personName: personName.trim(),
                amount: parsed,
                currency,
                direction,
                note: note.trim(),
              });
            }}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
            style={{
              background: 'var(--tg-button)',
              color: 'var(--tg-button-text)',
            }}
          >
            Сохранить
          </button>
        </div>
      ) : null}
    </div>
  );
}
