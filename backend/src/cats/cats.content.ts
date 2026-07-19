import { createHash } from 'crypto';

const OPENINGS = [
  'Этот хулиган',
  'Кот-батон',
  'Серьёзный начальник',
  'Пушистый диванный критик',
  'Мастер драмы',
  'Король коробки',
  'Профессиональный лентяй',
  'Мурлыка с характером',
  'Котик-интроверт',
  'Главный по обнимашкам',
  'Хвостатый комик',
  'Пушистый заговорщик',
];

const MIDDLES = [
  'сегодня слишком милый для этого мира',
  'делает вид, что ничего не происходило',
  'требует внимания и, возможно, вкусняшку',
  'застрял в коробке и не жалеет',
  'смотрит как начальник на отчёт',
  'готов устроить бесплатный концерт мурчания',
  'планирует захватить диван к обеду',
  'считает, что ты опоздал с завтраком',
  'притворяется невинным, но это ловушка',
  'уже оценил твой день на пять лап из пяти',
  'пришёл зарядить тебя смешняшкой',
  'думает, что прячется, хотя торчит хвост',
];

const ENDINGS = [
  'Мяу и точка.',
  'Обнимаю лапкой. Без спроса.',
  'Кусь, но по-дружески.',
  'Пусть день будет смешным.',
  'Ты молодец. Котик одобрил.',
  'Не забудь про паузу на мур.',
  'Улыбнись, это приказ.',
  'Хорошего дня, человек.',
];

const SAYS_LINES = [
  'Мяу',
  'Кусь',
  'Ня',
  'Сплю',
  'Дай еды',
  'Я boss',
  'Не трогай',
  'Люблю',
  'Где еда',
  'Мур',
];

type ContentContext = {
  userId: number;
  deliveryDate: string;
  name?: string;
};

type CatApiImage = { id: string; url: string; animated: boolean };

function textKey(text: string) {
  return createHash('sha256').update(text).digest('hex').slice(0, 32);
}

function mixSeed(ctx: ContentContext, salt = 0): number {
  const raw = `${ctx.userId}:${ctx.deliveryDate}:${salt}`;
  return createHash('sha256').update(raw).digest().readUInt32BE(0);
}

function buildCandidate(ctx: ContentContext, index: number) {
  const combos = OPENINGS.length * MIDDLES.length * ENDINGS.length;
  const seed = (mixSeed(ctx, index) + index * 131) % combos;
  const a = OPENINGS[seed % OPENINGS.length];
  const b = MIDDLES[Math.floor(seed / OPENINGS.length) % MIDDLES.length];
  const c =
    ENDINGS[
      Math.floor(seed / (OPENINGS.length * MIDDLES.length)) % ENDINGS.length
    ];
  const name = ctx.name?.trim();
  if (name && index % 5 === 0) {
    return `${name}, ${a.toLowerCase()} ${b}. ${c}`;
  }
  return `${a} ${b}. ${c}`;
}

async function inventUniqueText(
  ctx: ContentContext,
  usedKeys: Set<string>,
): Promise<{ text: string; textKey: string }> {
  const max = OPENINGS.length * MIDDLES.length * ENDINGS.length + usedKeys.size + 80;
  for (let i = 0; i < max; i += 1) {
    const text = buildCandidate(ctx, i);
    const key = textKey(text);
    if (!usedKeys.has(key)) {
      return { text, textKey: key };
    }
  }

  const fallback = `${ctx.name?.trim() ? `${ctx.name.trim()}, ` : ''}Котик №${mixSeed(ctx, 99) % 100000}. Мяу.`;
  return { text: fallback, textKey: textKey(fallback) };
}

function cataasStableUrl(id: string) {
  return `https://cataas.com/cat/${id}`;
}

async function fetchCataasJson(
  path: string,
  seed: number,
): Promise<CatApiImage | null> {
  const response = await fetch(
    `https://cataas.com/cat${path}?json=true&seed=${seed}`,
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    id?: string;
    _id?: string;
    url?: string;
    mimetype?: string;
    tags?: string[];
  };
  const id = data.id || data._id;
  if (!id) {
    return null;
  }
  const mime = (data.mimetype || '').toLowerCase();
  const tags = data.tags ?? [];
  const animated =
    mime.includes('gif') ||
    tags.includes('gif') ||
    path.includes('gif');
  return {
    id: `cataas-${id}`,
    url: cataasStableUrl(id),
    animated,
  };
}

async function fetchCataasSays(
  ctx: ContentContext,
  seed: number,
): Promise<CatApiImage | null> {
  const line = SAYS_LINES[seed % SAYS_LINES.length];
  const text =
    ctx.name?.trim() && seed % 3 === 0
      ? `${ctx.name.trim()}, ${line}`
      : line;
  const response = await fetch(
    `https://cataas.com/cat/says/${encodeURIComponent(text)}?json=true&seed=${seed}`,
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    id?: string;
    _id?: string;
    mimetype?: string;
  };
  const id = data.id || data._id;
  if (!id) {
    return null;
  }
  const mime = (data.mimetype || '').toLowerCase();
  return {
    id: `cataas-says-${id}`,
    url: cataasStableUrl(id),
    animated: mime.includes('gif'),
  };
}

async function fetchCatApiGif(seed: number): Promise<CatApiImage | null> {
  const response = await fetch(
    `https://api.thecatapi.com/v1/images/search?limit=10&mime_types=gif&order=RANDOM`,
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { id?: string; url?: string }[];
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  const item = data[seed % data.length];
  if (!item?.id || !item?.url) {
    return null;
  }
  return { id: `catapi-${item.id}`, url: item.url, animated: true };
}

type ImageContext = ContentContext & {
  excludeKeys: Set<string>;
};

async function fetchCatImage(ctx: ImageContext): Promise<CatApiImage> {
  const providers = [
    (seed: number) => fetchCataasJson('/gif', seed),
    (seed: number) => fetchCatApiGif(seed),
    (seed: number) => fetchCataasJson('/cute', seed),
    (seed: number) => fetchCataasSays(ctx, seed),
    (seed: number) => fetchCataasJson('', seed),
  ];

  let fallback: CatApiImage | null = null;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const seed = mixSeed(ctx, attempt + 1);
    const provider =
      providers[(mixSeed(ctx, attempt) + attempt) % providers.length];
    const item = await provider(seed);
    if (!item || ctx.excludeKeys.has(item.id)) {
      continue;
    }
    if (item.animated) {
      return item;
    }
    if (!fallback) {
      fallback = item;
    }
  }

  if (fallback) {
    return fallback;
  }

  const stamp = mixSeed(ctx, 777);
  const last = await fetchCataasJson('/gif', stamp);
  if (last) {
    return last;
  }

  return {
    id: `fallback-${ctx.userId}-${stamp}`,
    url: `https://cataas.com/cat/gif`,
    animated: true,
  };
}

function isAnimatedCatUrl(url: string) {
  const value = url.toLowerCase();
  return (
    value.includes('.gif') ||
    value.includes('mime_types=gif') ||
    value.includes('/gif') ||
    value.includes('cataas.com/cat/')
  );
}

export { inventUniqueText, fetchCatImage, textKey, isAnimatedCatUrl };
