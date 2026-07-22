export type WildberriesProduct = {
  title: string;
  note: string;
  imageUrl: string;
  productUrl: string;
};

function wbBasketHost(vol: number) {
  if (vol >= 0 && vol <= 143) return '01';
  if (vol <= 287) return '02';
  if (vol <= 431) return '03';
  if (vol <= 719) return '04';
  if (vol <= 1007) return '05';
  if (vol <= 1061) return '06';
  if (vol <= 1115) return '07';
  if (vol <= 1169) return '08';
  if (vol <= 1313) return '09';
  if (vol <= 1601) return '10';
  if (vol <= 1655) return '11';
  if (vol <= 1919) return '12';
  if (vol <= 2045) return '13';
  if (vol <= 2189) return '14';
  if (vol <= 2405) return '15';
  if (vol <= 2621) return '16';
  if (vol <= 2837) return '17';
  return '18';
}

export function buildWildberriesImageUrl(nm: number, index = 1) {
  const vol = Math.floor(nm / 100000);
  const part = Math.floor(nm / 1000);
  const host = wbBasketHost(vol);
  return `https://basket-${host}.wbbasket.ru/vol${vol}/part${part}/${nm}/images/big/${index}.webp`;
}

export function buildWildberriesProductUrl(nm: number) {
  return `https://www.wildberries.ru/catalog/${nm}/detail.aspx`;
}

export function extractWildberriesNm(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const direct = trimmed.match(/(?:catalog\/|\/)(\d{5,12})(?:\/|$|\?|&)/i);
  if (direct) {
    const nm = Number(direct[1]);
    return Number.isFinite(nm) && nm > 0 ? nm : null;
  }

  const query = trimmed.match(/[?&]nm=(\d{5,12})/i);
  if (query) {
    const nm = Number(query[1]);
    return Number.isFinite(nm) && nm > 0 ? nm : null;
  }

  return null;
}

function isWildberriesUrl(raw: string) {
  const value = raw.trim().toLowerCase();
  return value.includes('wildberries.') || value.includes('wb.ru');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export async function fetchWildberriesProduct(
  rawUrl: string,
): Promise<WildberriesProduct | null> {
  if (!isWildberriesUrl(rawUrl)) {
    return null;
  }

  const nm = extractWildberriesNm(rawUrl);
  if (!nm) {
    return null;
  }

  const endpoints = [
    `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${nm}`,
    `https://card.wb.ru/cards/v1/detail?appType=1&curr=rub&dest=-1257786&nm=${nm}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        continue;
      }
      const payload = (await response.json()) as unknown;
      const root = asRecord(payload);
      const data = asRecord(root?.data) ?? root;
      const products = data?.products;
      if (!Array.isArray(products) || products.length === 0) {
        continue;
      }
      const product = asRecord(products[0]);
      if (!product) {
        continue;
      }
      const title =
        typeof product.name === 'string' && product.name.trim()
          ? product.name.trim()
          : `Товар ${nm}`;
      const brand =
        typeof product.brand === 'string' && product.brand.trim()
          ? product.brand.trim()
          : '';
      return {
        title: title.slice(0, 200),
        note: brand.slice(0, 300),
        imageUrl: buildWildberriesImageUrl(nm),
        productUrl: buildWildberriesProductUrl(nm),
      };
    } catch {
      continue;
    }
  }

  return {
    title: `Товар ${nm}`,
    note: '',
    imageUrl: buildWildberriesImageUrl(nm),
    productUrl: buildWildberriesProductUrl(nm),
  };
}
