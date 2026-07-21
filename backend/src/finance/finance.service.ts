import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  aggregateProductsByCurrency,
  AlphaFinanceProduct,
  FinanceAlphaClient,
} from './finance-alpha.client';

const BUILTIN_ACCOUNTS = [
  { key: 'mellow', name: 'Mellow', sortOrder: 10, integration: 'mellow' },
  { key: 'alpha', name: 'Альфа-Банк', sortOrder: 20, integration: 'alpha' },
  { key: 'prior', name: 'Prior', sortOrder: 30, integration: 'prior' },
] as const;

export const FINANCE_CURRENCIES = [
  'BYN',
  'USD',
  'EUR',
  'RUB',
  'PLN',
  'CNY',
  'GBP',
] as const;

type ProviderKey = 'alpha' | 'mellow' | 'prior';

type ProviderStatus = {
  key: ProviderKey;
  name: string;
  integrationReady: boolean;
  connected: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  products: AlphaFinanceProduct[];
};

function normalizeCurrency(raw: string) {
  const currency = raw.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new BadRequestException('Некорректная валюта');
  }
  return currency;
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

type BalanceRow = { currency: string; amount: number };

function computeTotals(
  accounts: { balances: BalanceRow[] }[],
  cash: BalanceRow[],
) {
  const map = new Map<string, { accounts: number; cash: number }>();

  for (const account of accounts) {
    for (const balance of account.balances) {
      const row = map.get(balance.currency) ?? { accounts: 0, cash: 0 };
      row.accounts += balance.amount;
      map.set(balance.currency, row);
    }
  }

  for (const entry of cash) {
    const row = map.get(entry.currency) ?? { accounts: 0, cash: 0 };
    row.cash += entry.amount;
    map.set(entry.currency, row);
  }

  return [...map.entries()]
    .map(([currency, value]) => ({
      currency,
      accountsTotal: roundAmount(value.accounts),
      cashTotal: roundAmount(value.cash),
      grandTotal: roundAmount(value.accounts + value.cash),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function parseProducts(json: string): AlphaFinanceProduct[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as AlphaFinanceProduct[]) : [];
  } catch {
    return [];
  }
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alphaClient: FinanceAlphaClient,
  ) {}

  private uid(userId: number) {
    return BigInt(userId);
  }

  private async ensureBuiltinAccounts(userId: number) {
    const uid = this.uid(userId);
    for (const item of BUILTIN_ACCOUNTS) {
      await this.prisma.financeAccount.upsert({
        where: {
          userId_key: {
            userId: uid,
            key: item.key,
          },
        },
        create: {
          userId: uid,
          key: item.key,
          name: item.name,
          sortOrder: item.sortOrder,
        },
        update: {
          name: item.name,
          sortOrder: item.sortOrder,
        },
      });
    }
  }

  private providerStatuses(
    connections: {
      provider: string;
      lastSyncAt: Date | null;
      lastSyncError: string | null;
      productsJson: string;
    }[],
  ): ProviderStatus[] {
    const byProvider = new Map(connections.map((item) => [item.provider, item]));

    return BUILTIN_ACCOUNTS.map((item) => {
      const connection = byProvider.get(item.integration);
      const integrationReady =
        item.integration === 'alpha' ? this.alphaClient.isConfigured() : false;
      return {
        key: item.integration,
        name: item.name,
        integrationReady,
        connected: Boolean(connection),
        lastSyncAt: connection?.lastSyncAt?.toISOString() ?? null,
        lastSyncError: connection?.lastSyncError ?? null,
        products: connection ? parseProducts(connection.productsJson) : [],
      };
    });
  }

  private async loadOverview(userId: number) {
    const uid = this.uid(userId);
    const [accounts, cash, debts, connections] = await Promise.all([
      this.prisma.financeAccount.findMany({
        where: { userId: uid },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          balances: {
            orderBy: { currency: 'asc' },
          },
        },
      }),
      this.prisma.financeCash.findMany({
        where: { userId: uid },
        orderBy: { currency: 'asc' },
      }),
      this.prisma.financeDebt.findMany({
        where: { userId: uid },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.financeProviderConnection.findMany({
        where: { userId: uid },
      }),
    ]);

    const serializedAccounts = accounts.map((account) => ({
      id: account.id,
      key: account.key,
      name: account.name,
      sortOrder: account.sortOrder,
      isBuiltin: Boolean(account.key),
      balances: account.balances.map((balance) => ({
        currency: balance.currency,
        amount: roundAmount(balance.amount),
      })),
    }));

    const serializedCash = cash.map((entry) => ({
      currency: entry.currency,
      amount: roundAmount(entry.amount),
    }));

    const serializedDebts = debts.map((debt) => ({
      id: debt.id,
      personName: debt.personName,
      amount: roundAmount(debt.amount),
      currency: debt.currency,
      direction: debt.direction as 'i_owe' | 'owed_to_me',
      note: debt.note,
      sortOrder: debt.sortOrder,
    }));

    return {
      accounts: serializedAccounts,
      cash: serializedCash,
      debts: serializedDebts,
      totals: computeTotals(serializedAccounts, serializedCash),
      currencies: [...FINANCE_CURRENCIES],
      providers: this.providerStatuses(connections),
      alphaConfigured: this.alphaClient.isConfigured(),
    };
  }

  async overview(userId: number) {
    await this.ensureBuiltinAccounts(userId);
    return this.loadOverview(userId);
  }

  alphaConnect(userId: number) {
    if (!this.alphaClient.isConfigured()) {
      throw new ServiceUnavailableException(
        'На сервере не заданы ALPHA_CLIENT_ID и ALPHA_CLIENT_SECRET',
      );
    }
    const state = this.alphaClient.signState(userId);
    return {
      authUrl: this.alphaClient.buildAuthorizeUrl(state),
      redirectUri: this.alphaClient.resolveRedirectUri(),
    };
  }

  async alphaCallback(code: string | undefined, state: string | undefined) {
    if (!code || !state) {
      throw new BadRequestException('Нет code или state');
    }
    const userId = this.alphaClient.verifyState(state);
    const token = await this.alphaClient.exchangeCode(code);
    await this.saveProviderTokens(userId, 'alpha', token);
    try {
      await this.syncAlpha(userId);
      return { userId, syncOk: true as const };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось обновить счета';
      return { userId, syncOk: false as const, syncError: message };
    }
  }

  async alphaSync(userId: number) {
    return this.syncAlpha(userId);
  }

  async alphaDisconnect(userId: number) {
    const uid = this.uid(userId);
    await this.prisma.financeProviderConnection.deleteMany({
      where: { userId: uid, provider: 'alpha' },
    });
    const account = await this.prisma.financeAccount.findFirst({
      where: { userId: uid, key: 'alpha' },
    });
    if (account) {
      await this.prisma.financeAccountBalance.deleteMany({
        where: { accountId: account.id },
      });
    }
    return this.overview(userId);
  }

  buildAlphaReturnUrl(success: boolean, message?: string) {
    const url = new URL('http://169.58.29.177:8080/');
    url.searchParams.set('app', 'finance');
    url.searchParams.set('alpha', success ? 'connected' : 'error');
    if (message) {
      url.searchParams.set('alphaMessage', message.slice(0, 180));
    }
    return url.toString();
  }

  buildAlphaResultPage(success: boolean, message?: string) {
    const title = success ? 'Альфа-Банк подключён' : 'Не удалось подключить';
    const detail = success
      ? message?.trim() ||
        'Можно закрыть эту вкладку и вернуться в Telegram → lyshka-service → Финансы.'
      : message?.trim() ||
        'Попробуй подключить ещё раз из приложения в Telegram. Не обновляй эту страницу — код одноразовый.';
    const color = success ? '#1f6f5b' : '#9f1239';
    return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Manrope,system-ui,sans-serif;background:#dfe6ee;color:#0f172a;padding:24px}
    .card{max-width:420px;width:100%;background:#fff;border-radius:24px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,.08)}
    h1{margin:0 0 12px;font-size:24px;color:${color}}
    p{margin:0;line-height:1.5;color:#5f6f82;font-size:15px;word-break:break-word}
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${detail.replace(/</g, '&lt;')}</p>
  </div>
</body>
</html>`;
  }

  async setCash(userId: number, currencyRaw: string, amount: number) {
    const uid = this.uid(userId);
    const currency = normalizeCurrency(currencyRaw);
    const normalized = roundAmount(amount);

    if (normalized === 0) {
      await this.prisma.financeCash.deleteMany({
        where: { userId: uid, currency },
      });
    } else {
      await this.prisma.financeCash.upsert({
        where: {
          userId_currency: {
            userId: uid,
            currency,
          },
        },
        create: {
          userId: uid,
          currency,
          amount: normalized,
        },
        update: {
          amount: normalized,
        },
      });
    }

    return this.overview(userId);
  }

  async deleteCash(userId: number, currencyRaw: string) {
    const uid = this.uid(userId);
    const currency = normalizeCurrency(currencyRaw);
    await this.prisma.financeCash.deleteMany({
      where: { userId: uid, currency },
    });
    return this.overview(userId);
  }

  async createDebt(
    userId: number,
    data: {
      personName: string;
      amount: number;
      currency: string;
      direction: 'i_owe' | 'owed_to_me';
      note?: string;
    },
  ) {
    const uid = this.uid(userId);
    const personName = data.personName.trim();
    if (!personName) {
      throw new BadRequestException('Укажи имя');
    }

    const maxOrder = await this.prisma.financeDebt.aggregate({
      where: { userId: uid },
      _max: { sortOrder: true },
    });

    await this.prisma.financeDebt.create({
      data: {
        userId: uid,
        personName: personName.slice(0, 80),
        amount: roundAmount(data.amount),
        currency: normalizeCurrency(data.currency),
        direction: data.direction,
        note: data.note?.trim().slice(0, 200) ?? '',
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 10,
      },
    });

    return this.overview(userId);
  }

  async updateDebt(
    userId: number,
    debtId: string,
    patch: {
      personName?: string;
      amount?: number;
      currency?: string;
      direction?: 'i_owe' | 'owed_to_me';
      note?: string;
    },
  ) {
    const debt = await this.findDebt(userId, debtId);
    const data: {
      personName?: string;
      amount?: number;
      currency?: string;
      direction?: string;
      note?: string;
    } = {};

    if (patch.personName !== undefined) {
      const personName = patch.personName.trim();
      if (!personName) {
        throw new BadRequestException('Укажи имя');
      }
      data.personName = personName.slice(0, 80);
    }
    if (patch.amount !== undefined) {
      data.amount = roundAmount(patch.amount);
    }
    if (patch.currency !== undefined) {
      data.currency = normalizeCurrency(patch.currency);
    }
    if (patch.direction !== undefined) {
      data.direction = patch.direction;
    }
    if (patch.note !== undefined) {
      data.note = patch.note.trim().slice(0, 200);
    }

    await this.prisma.financeDebt.update({
      where: { id: debt.id },
      data,
    });

    return this.overview(userId);
  }

  async deleteDebt(userId: number, debtId: string) {
    const debt = await this.findDebt(userId, debtId);
    await this.prisma.financeDebt.delete({
      where: { id: debt.id },
    });
    return this.overview(userId);
  }

  private async syncAlpha(userId: number) {
    const uid = this.uid(userId);
    await this.ensureBuiltinAccounts(userId);
    const connection = await this.prisma.financeProviderConnection.findUnique({
      where: {
        userId_provider: {
          userId: uid,
          provider: 'alpha',
        },
      },
    });
    if (!connection) {
      throw new BadRequestException('Альфа-Банк не подключён');
    }

    try {
      const accessToken = await this.ensureAccessToken(connection);
      const products = await this.alphaClient.fetchProducts(accessToken);
      await this.applyProviderBalances(uid, 'alpha', products);
      await this.prisma.financeProviderConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncError: null,
          productsJson: JSON.stringify(products),
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Ошибка синхронизации';
      await this.prisma.financeProviderConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncError: message.slice(0, 500),
        },
      });
      throw err;
    }

    return this.overview(userId);
  }

  private async ensureAccessToken(connection: {
    id: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }) {
    const expired =
      connection.expiresAt &&
      connection.expiresAt.getTime() <= Date.now() + 60_000;
    if (!expired) {
      return connection.accessToken;
    }
    if (!connection.refreshToken) {
      throw new ServiceUnavailableException(
        'Токен Альфа-Банка истёк, подключи банк заново',
      );
    }
    const token = await this.alphaClient.refreshAccessToken(
      connection.refreshToken,
    );
    await this.prisma.financeProviderConnection.update({
      where: { id: connection.id },
      data: {
        ...this.tokenPatch(token, connection.refreshToken),
      },
    });
    return token.access_token;
  }

  private async saveProviderTokens(
    userId: number,
    provider: ProviderKey,
    token: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    },
  ) {
    const uid = this.uid(userId);
    await this.prisma.financeProviderConnection.upsert({
      where: {
        userId_provider: {
          userId: uid,
          provider,
        },
      },
      create: {
        userId: uid,
        provider,
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? null,
        scope: token.scope ?? '',
        expiresAt: this.expiresAt(token.expires_in),
      },
      update: {
        ...this.tokenPatch(token),
        lastSyncError: null,
      },
    });
  }

  private tokenPatch(
    token: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    },
    previousRefreshToken?: string | null,
  ) {
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? previousRefreshToken ?? null,
      scope: token.scope ?? '',
      expiresAt: this.expiresAt(token.expires_in),
    };
  }

  private expiresAt(expiresIn?: number) {
    if (!expiresIn || !Number.isFinite(expiresIn)) {
      return null;
    }
    return new Date(Date.now() + expiresIn * 1000);
  }

  private async applyProviderBalances(
    userId: bigint,
    accountKey: string,
    products: AlphaFinanceProduct[],
  ) {
    const account = await this.prisma.financeAccount.findFirst({
      where: { userId, key: accountKey },
    });
    if (!account) {
      throw new NotFoundException('Счёт провайдера не найден');
    }

    const totals = aggregateProductsByCurrency(products);
    const currencies = new Set(totals.map((item) => item.currency));

    for (const item of totals) {
      await this.prisma.financeAccountBalance.upsert({
        where: {
          accountId_currency: {
            accountId: account.id,
            currency: item.currency,
          },
        },
        create: {
          accountId: account.id,
          currency: item.currency,
          amount: item.amount,
        },
        update: {
          amount: item.amount,
        },
      });
    }

    if (currencies.size === 0) {
      await this.prisma.financeAccountBalance.deleteMany({
        where: { accountId: account.id },
      });
      return;
    }

    await this.prisma.financeAccountBalance.deleteMany({
      where: {
        accountId: account.id,
        currency: { notIn: [...currencies] },
      },
    });
  }

  private async findDebt(userId: number, debtId: string) {
    const debt = await this.prisma.financeDebt.findFirst({
      where: {
        id: debtId,
        userId: this.uid(userId),
      },
    });
    if (!debt) {
      throw new NotFoundException('Долг не найден');
    }
    return debt;
  }
}
