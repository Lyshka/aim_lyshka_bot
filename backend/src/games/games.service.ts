import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  fetchGamesMeta,
  fetchOwnedAppIds,
  fetchWishlist,
  parseSteamInput,
  resolveSteamId,
} from './games.steam';

function serializeProfile(profile: {
  steamId: string;
  vanityUrl: string | null;
  lastSyncAt: Date | null;
}) {
  return {
    steamId: profile.steamId,
    vanityUrl: profile.vanityUrl,
    profileUrl: profile.vanityUrl
      ? `https://steamcommunity.com/id/${profile.vanityUrl}`
      : `https://steamcommunity.com/profiles/${profile.steamId}`,
    lastSyncAt: profile.lastSyncAt?.toISOString() ?? null,
  };
}

function serializeGame(row: {
  id: string;
  appId: string;
  name: string;
  imageUrl: string;
  owned: boolean;
  priority: number;
  addedAt: Date | null;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    appId: row.appId,
    name: row.name,
    imageUrl: row.imageUrl,
    owned: row.owned,
    priority: row.priority,
    addedAt: row.addedAt?.toISOString() ?? null,
    storeUrl: `https://store.steampowered.com/app/${row.appId}`,
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private steamApiKey() {
    return this.configService.get<string>('STEAM_API_KEY')?.trim() ?? '';
  }

  async overview(userId: number) {
    const uid = BigInt(userId);
    const profile = await this.prisma.steamProfile.findUnique({
      where: { userId: uid },
    });

    const games = profile
      ? await this.prisma.steamWishlistGame.findMany({
          where: { userId: uid },
          orderBy: [{ owned: 'asc' }, { priority: 'asc' }, { name: 'asc' }],
        })
      : [];

    const owned = games.filter((g) => g.owned);
    const missing = games.filter((g) => !g.owned);

    return {
      steamConfigured: Boolean(this.steamApiKey()),
      profile: profile ? serializeProfile(profile) : null,
      stats: {
        total: games.length,
        owned: owned.length,
        missing: missing.length,
      },
      owned: owned.map(serializeGame),
      missing: missing.map(serializeGame),
    };
  }

  async linkProfile(userId: number, steamInput: string) {
    const apiKey = this.steamApiKey();
    parseSteamInput(steamInput);
    const steamId = await resolveSteamId(steamInput, apiKey);
    const parsed = parseSteamInput(steamInput);
    const vanityUrl = parsed.vanity ?? null;

    const profile = await this.prisma.steamProfile.upsert({
      where: { userId: BigInt(userId) },
      create: {
        userId: BigInt(userId),
        steamId,
        vanityUrl,
      },
      update: {
        steamId,
        vanityUrl,
      },
    });

    return this.sync(userId, profile);
  }

  async sync(userId: number, existingProfile?: {
    steamId: string;
    vanityUrl: string | null;
  }) {
    const apiKey = this.steamApiKey();
    const uid = BigInt(userId);

    const profile =
      existingProfile ??
      (await this.prisma.steamProfile.findUnique({
        where: { userId: uid },
      }));

    if (!profile) {
      throw new NotFoundException('Сначала привяжи Steam профиль');
    }

    const [wishlist, ownedIds] = await Promise.all([
      fetchWishlist(profile.steamId),
      fetchOwnedAppIds(profile.steamId, apiKey),
    ]);

    const appIds = [...wishlist.keys()];
    const meta = await fetchGamesMeta(appIds);
    const now = new Date();

    for (const appId of appIds) {
      const entry = wishlist.get(appId);
      const details = meta.get(appId);
      const owned = ownedIds.has(Number(appId));

      await this.prisma.steamWishlistGame.upsert({
        where: {
          userId_appId: {
            userId: uid,
            appId,
          },
        },
        create: {
          userId: uid,
          appId,
          name: details?.name ?? `Игра ${appId}`,
          imageUrl: details?.imageUrl ?? '',
          owned,
          priority: entry?.priority ?? 0,
          addedAt: entry?.added ? new Date(entry.added * 1000) : null,
          updatedAt: now,
        },
        update: {
          name: details?.name ?? `Игра ${appId}`,
          imageUrl: details?.imageUrl ?? '',
          owned,
          priority: entry?.priority ?? 0,
          addedAt: entry?.added ? new Date(entry.added * 1000) : null,
          updatedAt: now,
        },
      });
    }

    await this.prisma.steamWishlistGame.deleteMany({
      where: {
        userId: uid,
        appId: { notIn: appIds },
      },
    });

    await this.prisma.steamProfile.update({
      where: { userId: uid },
      data: { lastSyncAt: now },
    });

    return this.overview(userId);
  }

  async resync(userId: number) {
    return this.sync(userId);
  }
}
