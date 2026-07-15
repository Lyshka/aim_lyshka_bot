import { createHmac, timingSafeEqual } from 'crypto';

export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type ValidatedWebAppData = {
  user: TelegramWebAppUser;
  authDate: number;
  queryId?: string;
  startParam?: string;
};

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): ValidatedWebAppData | null {
  if (!initData || !botToken) {
    return null;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    return null;
  }

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const hashBuffer = Buffer.from(hash, 'hex');
  const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

  if (
    hashBuffer.length !== calculatedBuffer.length ||
    !timingSafeEqual(hashBuffer, calculatedBuffer)
  ) {
    return null;
  }

  const authDate = Number(params.get('auth_date') ?? 0);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || now - authDate > maxAgeSeconds) {
    return null;
  }

  const userRaw = params.get('user');
  if (!userRaw) {
    return null;
  }

  const user = JSON.parse(userRaw) as TelegramWebAppUser;
  if (!user?.id) {
    return null;
  }

  return {
    user,
    authDate,
    queryId: params.get('query_id') ?? undefined,
    startParam: params.get('start_param') ?? undefined,
  };
}
