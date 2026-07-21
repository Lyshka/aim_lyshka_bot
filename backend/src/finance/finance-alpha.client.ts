import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import * as https from 'https';
import { URL } from 'url';
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

type AlphaHttpResult = {
  status: number;
  text: string;
};

function previewBody(text: string, max = 160) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return 'пусто';
  }
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function parseTokenPayload(text: string): AlphaTokenResponse | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed) as AlphaTokenResponse;
      if (json.access_token) {
        return json;
      }
    } catch {
      return null;
    }
  }

  if (trimmed.includes('access_token=')) {
    const params = new URLSearchParams(trimmed);
    const accessToken = params.get('access_token');
    if (!accessToken) {
      return null;
    }
    const expiresRaw = params.get('expires_in');
    return {
      access_token: accessToken,
      refresh_token: params.get('refresh_token') ?? undefined,
      expires_in: expiresRaw ? Number(expiresRaw) : undefined,
      scope: params.get('scope') ?? undefined,
      token_type: params.get('token_type') ?? undefined,
    };
  }

  return null;
}

function parseJsonPayload(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function alphaHttpsRequest(
  targetUrl: string,
  options: {
    method: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  },
): Promise<AlphaHttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: options.method,
        headers: options.headers,
        rejectUnauthorized: false,
        servername: url.hostname,
        timeout: options.timeoutMs ?? 20000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            text: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout ${url.hostname}:${url.port || 443}`));
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
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
    return this.requestToken(config, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<AlphaTokenResponse> {
    const config = this.requireConfig();
    return this.requestToken(config, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  async fetchProducts(accessToken: string): Promise<AlphaFinanceProduct[]> {
    const config = this.requireConfig();
    const configuredPath = config.accountsPath.startsWith('/')
      ? config.accountsPath
      : `/${config.accountsPath}`;
    const paths = [
      configuredPath,
      '/individual/accounts/1.0.0/accounts',
      '/individual/1.0.0/accounts',
      '/accounts/1.0.0/accounts',
    ].filter((value, index, list) => list.indexOf(value) === index);

    const attempts: Array<{ base: string; timeoutMs: number }> = [
      { base: config.oauthBase.replace(/\/$/, ''), timeoutMs: 12000 },
      { base: config.apiBase.replace(/\/$/, ''), timeoutMs: 5000 },
    ].filter(
      (item, index, list) =>
        list.findIndex((entry) => entry.base === item.base) === index,
    );

    let lastError = 'Не удалось получить счета Альфа-Банка';
    for (const attempt of attempts) {
      for (const path of paths) {
        const url = `${attempt.base}${path}`;
        try {
          const response = await alphaHttpsRequest(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
            timeoutMs: attempt.timeoutMs,
          });
          const payload = parseJsonPayload(response.text);
          if (!payload) {
            lastError = `HTTP ${response.status}: ${previewBody(response.text)} (${url})`;
            continue;
          }
          if (response.status < 200 || response.status >= 300) {
            const message =
              typeof payload === 'object' &&
              payload &&
              'message' in payload &&
              typeof (payload as { message?: unknown }).message === 'string'
                ? (payload as { message: string }).message
                : `HTTP ${response.status}: ${previewBody(response.text)}`;
            lastError = `${message} (${url})`;
            continue;
          }

          const products: AlphaFinanceProduct[] = [];
          collectProducts(payload, products);
          const dedup = new Map<string, AlphaFinanceProduct>();
          for (const product of products) {
            dedup.set(`${product.id}:${product.currency}`, product);
          }
          return [...dedup.values()];
        } catch (err) {
          lastError =
            err instanceof Error
              ? `Сеть: ${err.message}`
              : 'Сеть: ошибка запроса счетов';
        }
      }
    }

    throw new ServiceUnavailableException(lastError);
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
    fields: Record<string, string>,
  ): Promise<AlphaTokenResponse> {
    const tokenUrl =
      this.configService.get<string>('ALPHA_TOKEN_URL')?.trim() ||
      `${config.oauthBase.replace(/\/$/, '')}/token`;

    const auth = Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
    ).toString('base64');

    const bodies: URLSearchParams[] = [
      new URLSearchParams({
        ...fields,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
      new URLSearchParams(fields),
    ];

    const headerVariants: Array<Record<string, string>> = [
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, application/x-www-form-urlencoded, */*',
        Authorization: `Basic ${auth}`,
      },
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, application/x-www-form-urlencoded, */*',
      },
    ];

    let lastError = 'Не удалось получить токен Альфа-Банка';

    for (const body of bodies) {
      const payloadBody = body.toString();
      for (const headers of headerVariants) {
        try {
          const response = await alphaHttpsRequest(tokenUrl, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Length': Buffer.byteLength(payloadBody).toString(),
            },
            body: payloadBody,
            timeoutMs: 15000,
          });
          if (response.status < 200 || response.status >= 300) {
            lastError = `HTTP ${response.status}: ${previewBody(response.text)} (${tokenUrl})`;
            continue;
          }
          const token = parseTokenPayload(response.text);
          if (!token?.access_token) {
            lastError = `HTTP ${response.status}: ${previewBody(response.text)} (${tokenUrl})`;
            continue;
          }
          return token;
        } catch (err) {
          lastError =
            err instanceof Error
              ? `Сеть: ${err.message}`
              : 'Сеть: ошибка запроса токена';
        }
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
