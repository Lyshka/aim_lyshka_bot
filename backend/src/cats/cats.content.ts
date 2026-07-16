import { createHash } from 'crypto';

const OPENINGS = [
  'Сегодняшний котик',
  'Этот малыш',
  'Пушистый герой дня',
  'Маленькое чудо',
  'Котик с характером',
  'Тёплый комочек',
  'Утренний мурчало',
  'Мягкая радость',
  'Солнечный хвостик',
  'Тихий обнимашка',
];

const MIDDLES = [
  'смотрит так, будто уже любит тебя',
  'пришёл напомнить, что ты молодец',
  'принёс чуть-чуть спокойствия',
  'верит в твой хороший день',
  'готов мурчать рядом',
  'хранит твоё настроение',
  'шепчет: всё получится',
  'делится своей уютностью',
  'охраняет твою улыбку',
  'просто очень милый сегодня',
];

const ENDINGS = [
  'Мяу.',
  'Обнимаю лапкой.',
  'Пусть день будет мягким.',
  'Ты заслуживаешь тепла.',
  'Уютного утра.',
  'Хорошего дня.',
  'Береги себя.',
  'Улыбнись ему в ответ.',
];

function textKey(text: string) {
  return createHash('sha256').update(text).digest('hex').slice(0, 32);
}

function buildCandidate(seed: number) {
  const a = OPENINGS[seed % OPENINGS.length];
  const b = MIDDLES[Math.floor(seed / OPENINGS.length) % MIDDLES.length];
  const c =
    ENDINGS[
      Math.floor(seed / (OPENINGS.length * MIDDLES.length)) % ENDINGS.length
    ];
  return `${a} ${b}. ${c}`;
}

async function inventUniqueText(usedKeys: Set<string>): Promise<{
  text: string;
  textKey: string;
}> {
  const max =
    OPENINGS.length * MIDDLES.length * ENDINGS.length + usedKeys.size + 50;
  for (let i = 0; i < max; i += 1) {
    const seed = (Date.now() + i * 97) % (OPENINGS.length * MIDDLES.length * ENDINGS.length * 3);
    const text = buildCandidate(Math.abs(seed));
    const key = textKey(text);
    if (!usedKeys.has(key)) {
      return { text, textKey: key };
    }
  }

  const fallback = `Котик дня №${Date.now() % 100000}. Мяу.`;
  return { text: fallback, textKey: textKey(fallback) };
}

type CatApiImage = { id: string; url: string };

async function fetchCatImage(excludeKeys: Set<string>): Promise<CatApiImage> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await fetch(
      'https://api.thecatapi.com/v1/images/search?limit=1&size=med',
    );
    if (!response.ok) {
      continue;
    }
    const data = (await response.json()) as CatApiImage[];
    const item = data[0];
    if (!item?.id || !item?.url) {
      continue;
    }
    if (!excludeKeys.has(item.id)) {
      return item;
    }
  }

  const stamp = Date.now();
  return {
    id: `fallback-${stamp}`,
    url: `https://cataas.com/cat?${stamp}`,
  };
}

export { inventUniqueText, fetchCatImage, textKey };
