import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AlphaTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export type AlphaFinanceProduct = {
  id: string;
  name: string;
  type: string;
  currency: string;
  amount: number;
  maskedNumber?: string | null;
};

type AlphaClientConfig = {
  clientId: string;
  clientSecret: string;
  oauthBase: string;
  apiBase: string;
  accountsPath: string;
  scope: string;
  redirectUri: string;
};

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function readCurrency(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }
  if (normalized === '933' || normalized === 'BYN') {
    return 'BYN';
  }
  if (normalized === '840' || normalized === 'USD') {
    return 'USD';
  }
  if (normalized === '978' || normalized === 'EUR') {
    return 'EUR';
  }
  if (normalized === '643' || normalized === 'RUB') {
    return 'RUB';
  }
  return null;
}

function pickAmount(source: Record<string, unknown>): number | null {
  const keys = [
    'balance',
    'amount',
    'availableBalance',
    'rest',
    'saldo',
    'currentBalance',
    'amountBalance',
  ];
  for (const key of keys) {
    const direct = readNumber(source[key]);
    if (direct !== null) {
      return direct;
    }
    const nested = asRecord(source[key]);
    if (nested) {
      const nestedAmount = readNumber(nested.amount ?? nested.value);
      if (nestedAmount !== null) {
        return nestedAmount;
      }
    }
  }
  return null;
}

function pickCurrency(source: Record<string, unknown>): string | null {
  const keys = ['currency', 'currencyCode', 'curr', 'currencyIso', 'ccy'];
  for (const key of keys) {
    const value = readCurrency(source[key]);
    if (value) {
      return value;
    }
  }
  const nested = asRecord(source.currency);
  if (nested) {
    return readCurrency(nested.code ?? nested.isoCode ?? nested.name);
  }
  return null;
}

function collectProducts(node: unknown, output: AlphaFinanceProduct[]) {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectProducts(item, output);
    }
    return;
  }

  const record = asRecord(node);
  if (!record) {
    return;
  }

  const amount = pickAmount(record);
  const currency = pickCurrency(record) ?? 'BYN';
  const id = String(
    record.id ??
      record.accountId ??
      record.productId ??
      record.number ??
      record.iban ??
      `${record.name ?? record.title ?? 'product'}-${output.length}`,
  );
  const name = String(
    record.name ?? record.title ?? record.productName ?? record.type ?? 'Счёт',
  );
  const type = String(record.type ?? record.productType ?? record.kind ?? 'account');
  const maskedNumber =
    typeof record.maskedNumber === 'string'
      ? record.maskedNumber
      : typeof record.number === 'string'
        ? record.number
        : typeof record.iban === 'string'
          ? record.iban
          : null;

  if (amount !== null) {
    output.push({
      id,
      name,
      type,
      currency,
      amount: roundAmount(amount),
      maskedNumber,
    });
  }

  for (const key of [
    'accounts',
    'cards',
    'deposits',
    'credits',
    'products',
    'items',
    'data',
    'result',
    'content',
  ]) {
    if (record[key] !== undefined) {
      collectProducts(record[key], output);
    }
  }
}

@Injectable()
export class FinanceAlphaClient {
  constructor(private readonly configService: ConfigService) {}

  isConfigured() {
    const config = this.readConfig(false);
    return Boolean(config?.clientId && config.clientSecret && config.redirectUri);
  }

  buildAuthorizeUrl(state: string) {
    const config = this.requireConfig();
    const url = new URL(`${config.oauthBase.replace(/\/$/, '')}/authorize`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('scope', config.scope);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<AlphaTokenResponse> {
    const config = this.requireConfig();
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', config.redirectUri);
    body.set('client_id', config.clientId);
    body.set('client_secret', config.clientSecret);
    return this.requestToken(config, body);
  }

  async refreshAccessToken(refreshToken: string): Promise<AlphaTokenResponse> {
    const config = this.requireConfig();
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
    body.set('client_id', config.clientId);
    body.set('client_secret', config.clientSecret);
    return this.requestToken(config, body);
  }

  async fetchProducts(accessToken: string): Promise<AlphaFinanceProduct[]> {
    const config = this.requireConfig();
    const path = config.accountsPath.startsWith('/')
      ? config.accountsPath
      : `/${config.accountsPath}`;
    const url = `${config.apiBase.replace(/\/$/, '')}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new ServiceUnavailableException(
          'Альфа-Банк вернул некорректный ответ',
        );
      }
    }
    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload &&
        'message' in payload &&
        typeof (payload as { message?: unknown }).message === 'string'
          ? (payload as { message: string }).message
          : `HTTP ${response.status}`;
      throw new ServiceUnavailableException(message);
    }

    const products: AlphaFinanceProduct[] = [];
    collectProducts(payload, products);

    const dedup = new Map<string, AlphaFinanceProduct>();
    for (const product of products) {
      dedup.set(`${product.id}:${product.currency}`, product);
    }
    return [...dedup.values()];
  }

  signState(userId: number) {
    const secret = this.oauthSecret();
    const payload = {
      userId,
      ts: Date.now(),
      nonce: randomBytes(8).toString('hex'),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  verifyState(state: string): number {
    const secret = this.oauthSecret();
    const [encoded, signature] = state.split('.');
    if (!encoded || !signature) {
      throw new BadRequestException('Некорректный state');
    }
    const expected = createHmac('sha256', secret)
      .update(encoded)
      .digest('base64url');
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new BadRequestException('Некорректный state');
    }
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as { userId?: number; ts?: number };
    if (!payload.userId || !payload.ts) {
      throw new BadRequestException('Некорректный state');
    }
    if (Date.now() - payload.ts > 1000 * 60 * 30) {
      throw new BadRequestException('Сессия авторизации истекла');
    }
    return payload.userId;
  }

  resolveRedirectUri(): string {
    return 'http://169.58.29.177:8080/api/finance/alpha/callback';
  }

  private oauthSecret() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    if (!token) {
      throw new ServiceUnavailableException('TELEGRAM_BOT_TOKEN не задан');
    }
    return token;
  }

  private readConfig(required: boolean): AlphaClientConfig | null {
    const clientId = this.configService.get<string>('ALPHA_CLIENT_ID')?.trim() ?? '';
    const clientSecret =
      this.configService.get<string>('ALPHA_CLIENT_SECRET')?.trim() ?? '';
    const oauthBase =
      this.configService.get<string>('ALPHA_OAUTH_BASE')?.trim() ||
      'https://developerhub.alfabank.by:8273';
    const apiBase =
      this.configService.get<string>('ALPHA_API_BASE')?.trim() ||
      'https://developerhub.alfabank.by:8243';
    const accountsPath =
      this.configService.get<string>('ALPHA_ACCOUNTS_PATH')?.trim() ||
      '/individual/accounts/v1/accounts';
    const scope =
      this.configService.get<string>('ALPHA_SCOPE')?.trim() || 'accounts profile';
    const redirectUri = this.resolveRedirectUri();

    if (!clientId || !clientSecret) {
      if (required) {
        throw new ServiceUnavailableException(
          'Интеграция Альфа-Банка не настроена: нужны ALPHA_CLIENT_ID и ALPHA_CLIENT_SECRET',
        );
      }
      return null;
    }

    return {
      clientId,
      clientSecret,
      oauthBase,
      apiBase,
      accountsPath,
      scope,
      redirectUri,
    };
  }

  private requireConfig() {
    const config = this.readConfig(true);
    if (!config) {
      throw new ServiceUnavailableException(
        'Интеграция Альфа-Банка не настроена',
      );
    }
    return config;
  }

  private async requestToken(
    config: AlphaClientConfig,
    body: URLSearchParams,
  ): Promise<AlphaTokenResponse> {
    const tokenUrls = [
      this.configService.get<string>('ALPHA_TOKEN_URL')?.trim(),
      `${config.oauthBase.replace(/\/$/, '')}/token`,
      `${config.apiBase.replace(/\/$/, '')}/token`,
      `${config.oauthBase.replace(/\/$/, '')}/oauth/token`,
      `${config.apiBase.replace(/\/$/, '')}/oauth/token`,
    ].filter((value, index, list): value is string =>
      Boolean(value) && list.indexOf(value) === index,
    );

    const auth = Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
    ).toString('base64');

    let lastError = 'Не удалось получить токен Альфа-Банка';

    for (const tokenUrl of tokenUrls) {
      try {
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body,
        });
        const text = await response.text();
        let payload: unknown = null;
        if (text) {
          try {
            payload = JSON.parse(text);
          } catch {
            lastError = `Некорректный ответ токена (${tokenUrl})`;
            continue;
          }
        }
        if (!response.ok) {
          const message =
            typeof payload === 'object' &&
            payload &&
            'error_description' in payload &&
            typeof (payload as { error_description?: unknown }).error_description ===
              'string'
              ? (payload as { error_description: string }).error_description
              : typeof payload === 'object' &&
                  payload &&
                  'error' in payload &&
                  typeof (payload as { error?: unknown }).error === 'string'
                ? (payload as { error: string }).error
                : `HTTP ${response.status}`;
          lastError = message;
          continue;
        }
        const token = payload as AlphaTokenResponse;
        if (!token.access_token) {
          lastError = 'Альфа-Банк не вернул access_token';
          continue;
        }
        return token;
      } catch (err) {
        const cause =
          err instanceof Error
            ? ((err as Error & { cause?: { message?: string; code?: string } })
                .cause?.message ??
              (err as Error & { cause?: { code?: string } }).cause?.code ??
              err.message)
            : 'network error';
        lastError = `Сеть: ${cause}`;
      }
    }

    throw new ServiceUnavailableException(lastError);
  }
}

export function aggregateProductsByCurrency(products: AlphaFinanceProduct[]) {
  const map = new Map<string, number>();
  for (const product of products) {
    map.set(
      product.currency,
      roundAmount((map.get(product.currency) ?? 0) + product.amount),
    );
  }
  return [...map.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
