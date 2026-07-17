import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

type ParsedSteamInput = {
  steamId?: string;
  vanity?: string;
};

type ResolveResponse = {
  response?: {
    success?: number;
    steamid?: string;
    message?: string;
  };
};

type OwnedGamesResponse = {
  response?: {
    game_count?: number;
    games?: { appid: number; name?: string }[];
  };
};

type WishlistEntry = {
  priority?: number;
  added?: number;
};

type AppDetailsResponse = {
  [appId: string]: {
    success?: boolean;
    data?: {
      name?: string;
      header_image?: string;
    };
  };
};

function headerImage(appId: string) {
  return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
}

function parseSteamInput(input: string): ParsedSteamInput {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new BadRequestException('Укажи Steam профиль');
  }

  const profileMatch = trimmed.match(
    /steamcommunity\.com\/profiles\/(\d{17})/i,
  );
  if (profileMatch) {
    return { steamId: profileMatch[1] };
  }

  const idMatch = trimmed.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (idMatch) {
    return { vanity: decodeURIComponent(idMatch[1]) };
  }

  if (/^\d{17}$/.test(trimmed)) {
    return { steamId: trimmed };
  }

  if (/^[a-zA-Z0-9_-]{2,32}$/.test(trimmed)) {
    return { vanity: trimmed };
  }

  throw new BadRequestException(
    'Некорректный Steam профиль. Вставь ссылку, Steam ID или ник.',
  );
}

async function resolveVanityUrl(
  vanity: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${encodeURIComponent(apiKey)}&vanityurl=${encodeURIComponent(vanity)}`,
  );
  if (!response.ok) {
    throw new ForbiddenException('Steam API недоступен');
  }
  const data = (await response.json()) as ResolveResponse;
  if (data.response?.success === 1 && data.response.steamid) {
    return data.response.steamid;
  }
  throw new BadRequestException('Steam профиль не найден');
}

async function resolveSteamId(input: string, apiKey: string): Promise<string> {
  const parsed = parseSteamInput(input);
  if (parsed.steamId) {
    return parsed.steamId;
  }
  if (!apiKey) {
    throw new ForbiddenException('Steam API ключ не настроен на сервере');
  }
  if (parsed.vanity) {
    return resolveVanityUrl(parsed.vanity, apiKey);
  }
  throw new BadRequestException('Не удалось определить Steam профиль');
}

async function fetchOwnedAppIds(
  steamId: string,
  apiKey: string,
): Promise<Set<number>> {
  if (!apiKey) {
    return new Set();
  }

  const owned = new Set<number>();
  let cursor: string | undefined;
  let guard = 0;

  while (guard < 20) {
    guard += 1;
    const params = new URLSearchParams({
      key: apiKey,
      steamid: steamId,
      include_appinfo: '0',
      include_played_free_games: '1',
      format: 'json',
    });
    if (cursor) {
      params.set('start_assetid', cursor);
    }

    const response = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?${params.toString()}`,
    );
    if (!response.ok) {
      break;
    }

    const data = (await response.json()) as OwnedGamesResponse;
    const games = data.response?.games ?? [];
    for (const game of games) {
      owned.add(game.appid);
    }

    if (games.length < 1000) {
      break;
    }
    cursor = String(games[games.length - 1]?.appid ?? '');
    if (!cursor) {
      break;
    }
  }

  return owned;
}

async function fetchWishlist(
  steamId: string,
): Promise<Map<string, WishlistEntry>> {
  const response = await fetch(
    `https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'lyshka-service/1.0',
      },
    },
  );

  if (response.status === 403 || response.status === 401) {
    throw new ForbiddenException(
      'Wishlist скрыт. Сделай профиль и список желаемого публичными в Steam.',
    );
  }

  if (!response.ok) {
    throw new ForbiddenException('Не удалось загрузить wishlist из Steam');
  }

  const data = (await response.json()) as Record<string, WishlistEntry>;
  const map = new Map<string, WishlistEntry>();
  for (const [appId, entry] of Object.entries(data)) {
    if (/^\d+$/.test(appId)) {
      map.set(appId, entry);
    }
  }
  return map;
}

async function fetchGameMeta(appId: string): Promise<{
  name: string;
  imageUrl: string;
}> {
  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=ru&l=russian`,
      {
        headers: { 'User-Agent': 'lyshka-service/1.0' },
      },
    );
    if (!response.ok) {
      return { name: `Игра ${appId}`, imageUrl: headerImage(appId) };
    }
    const data = (await response.json()) as AppDetailsResponse;
    const item = data[appId];
    if (!item?.success || !item.data?.name) {
      return { name: `Игра ${appId}`, imageUrl: headerImage(appId) };
    }
    return {
      name: item.data.name,
      imageUrl: item.data.header_image || headerImage(appId),
    };
  } catch {
    return { name: `Игра ${appId}`, imageUrl: headerImage(appId) };
  }
}

async function fetchGamesMeta(appIds: string[]) {
  const result = new Map<string, { name: string; imageUrl: string }>();
  const chunkSize = 4;
  for (let i = 0; i < appIds.length; i += chunkSize) {
    const chunk = appIds.slice(i, i + chunkSize);
    const items = await Promise.all(
      chunk.map(async (appId) => {
        const meta = await fetchGameMeta(appId);
        return [appId, meta] as const;
      }),
    );
    for (const [appId, meta] of items) {
      result.set(appId, meta);
    }
  }
  return result;
}

export {
  parseSteamInput,
  resolveSteamId,
  fetchOwnedAppIds,
  fetchWishlist,
  fetchGamesMeta,
  headerImage,
};
