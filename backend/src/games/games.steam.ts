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
    games?: {
      appid: number;
      name?: string;
      img_icon_url?: string;
    }[];
  };
};

type OwnedGameInfo = {
  appId: string;
  name: string;
  imageUrl: string;
};

type WishlistEntry = {
  priority?: number;
  added?: number;
};

type WishlistApiResponse = {
  response?: {
    items?: {
      appid?: number;
      priority?: number;
      date_added?: number;
    }[];
  };
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

async function fetchOwnedGames(
  steamId: string,
  apiKey: string,
): Promise<Map<string, OwnedGameInfo>> {
  if (!apiKey) {
    throw new ForbiddenException(
      'STEAM_API_KEY не задан на сервере — вкладка «Есть» не может загрузить библиотеку.',
    );
  }

  const params = new URLSearchParams({
    key: apiKey,
    steamid: steamId,
    include_appinfo: '1',
    include_played_free_games: '1',
    include_free_sub: '1',
    format: 'json',
  });

  const response = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params.toString()}`,
  );

  if (!response.ok) {
    throw new ForbiddenException(
      'Не удалось загрузить библиотеку Steam. Проверь STEAM_API_KEY.',
    );
  }

  const data = (await response.json()) as OwnedGamesResponse;
  const responseBody = data.response;
  const games = responseBody?.games;
  const gameCount = responseBody?.game_count;

  if (!responseBody || (games == null && gameCount == null)) {
    throw new ForbiddenException(
      'Библиотека скрыта. В Steam: Конфиденциальность → Список игр → Открытый.',
    );
  }

  if (!games || games.length === 0) {
    if (gameCount === 0) {
      throw new ForbiddenException(
        'Библиотека пуста или скрыта. Открой «Список игр» в конфиденциальности Steam.',
      );
    }
    throw new ForbiddenException(
      'Библиотека скрыта. В Steam: Конфиденциальность → Список игр → Открытый.',
    );
  }

  const owned = new Map<string, OwnedGameInfo>();
  for (const game of games) {
    if (!game.appid) {
      continue;
    }
    const appId = String(game.appid);
    owned.set(appId, {
      appId,
      name: game.name?.trim() || `Игра ${appId}`,
      imageUrl: headerImage(appId),
    });
  }
  return owned;
}

async function fetchWishlist(
  steamId: string,
): Promise<Map<string, WishlistEntry>> {
  const response = await fetch(
    `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${encodeURIComponent(steamId)}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; lyshka-service/1.0)',
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

  const raw = await response.text();
  if (!raw.trim()) {
    return new Map();
  }

  let data: WishlistApiResponse;
  try {
    data = JSON.parse(raw) as WishlistApiResponse;
  } catch {
    throw new ForbiddenException(
      'Steam вернул некорректный ответ. Проверь, что профиль и wishlist публичные.',
    );
  }

  const items = data.response?.items ?? [];
  const map = new Map<string, WishlistEntry>();
  for (const item of items) {
    if (!item?.appid) {
      continue;
    }
    map.set(String(item.appid), {
      priority: item.priority ?? 0,
      added: item.date_added,
    });
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

async function fetchPlayerSummary(
  steamId: string,
  apiKey: string,
): Promise<{ personaName: string; avatarUrl: string }> {
  if (!apiKey) {
    return { personaName: steamId, avatarUrl: '' };
  }

  const response = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(apiKey)}&steamids=${encodeURIComponent(steamId)}`,
  );
  if (!response.ok) {
    return { personaName: steamId, avatarUrl: '' };
  }

  const data = (await response.json()) as {
    response?: {
      players?: {
        personaname?: string;
        avatarfull?: string;
        avatarmedium?: string;
        avatar?: string;
      }[];
    };
  };
  const player = data.response?.players?.[0];
  return {
    personaName: player?.personaname?.trim() || steamId,
    avatarUrl:
      player?.avatarfull ||
      player?.avatarmedium ||
      player?.avatar ||
      '',
  };
}

export {
  parseSteamInput,
  resolveSteamId,
  fetchOwnedGames,
  fetchWishlist,
  fetchGamesMeta,
  fetchPlayerSummary,
  headerImage,
};
