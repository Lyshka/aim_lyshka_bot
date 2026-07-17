import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  fetchGamesMeta,
  fetchOwnedGames,
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
    try {
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
          total: missing.length + owned.length,
          owned: owned.length,
          missing: missing.length,
        },
        owned: owned.map(serializeGame),
        missing: missing.map(serializeGame),
      };
    } catch (err) {
      this.rethrowDbError(err);
    }
  }

  async linkProfile(userId: number, steamInput: string) {
    try {
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
    } catch (err) {
      this.rethrowDbError(err);
    }
  }

  async sync(
    userId: number,
    existingProfile?: {
      steamId: string;
      vanityUrl: string | null;
    },
  ) {
    try {
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

      const [wishlist, ownedGames] = await Promise.all([
        fetchWishlist(profile.steamId),
        fetchOwnedGames(profile.steamId, apiKey),
      ]);

      const wishlistIds = [...wishlist.keys()];
      const ownedIds = [...ownedGames.keys()];
      const keepIds = [...new Set([...wishlistIds, ...ownedIds])];
      const missingIds = wishlistIds.filter((id) => !ownedGames.has(id));
      const meta = await fetchGamesMeta(missingIds);
      const now = new Date();

      for (const appId of missingIds) {
        const entry = wishlist.get(appId);
        const details = meta.get(appId);
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
            owned: false,
            priority: entry?.priority ?? 0,
            addedAt: entry?.added ? new Date(entry.added * 1000) : null,
            updatedAt: now,
          },
          update: {
            name: details?.name ?? `Игра ${appId}`,
            imageUrl: details?.imageUrl ?? '',
            owned: false,
            priority: entry?.priority ?? 0,
            addedAt: entry?.added ? new Date(entry.added * 1000) : null,
            updatedAt: now,
          },
        });
      }

      for (const [appId, game] of ownedGames) {
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
            name: game.name,
            imageUrl: game.imageUrl,
            owned: true,
            priority: 0,
            addedAt: null,
            updatedAt: now,
          },
          update: {
            name: game.name,
            imageUrl: game.imageUrl,
            owned: true,
            priority: 0,
            updatedAt: now,
          },
        });
      }

      if (keepIds.length === 0) {
        await this.prisma.steamWishlistGame.deleteMany({
          where: { userId: uid },
        });
      } else {
        await this.prisma.steamWishlistGame.deleteMany({
          where: {
            userId: uid,
            appId: { notIn: keepIds },
          },
        });
      }

      await this.prisma.steamProfile.update({
        where: { userId: uid },
        data: { lastSyncAt: now },
      });

      return this.overview(userId);
    } catch (err) {
      this.rethrowDbError(err);
    }
  }

  async resync(userId: number) {
    return this.sync(userId);
  }

  private rethrowDbError(err: unknown): never {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: string }).code)
        : '';
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: string }).message)
        : '';
    if (
      code === 'P2021' ||
      message.includes('SteamProfile') ||
      message.includes('SteamWishlistGame')
    ) {
      throw new BadRequestException(
        'Таблицы игр не созданы. Перезапусти backend — миграция должна примениться автоматически.',
      );
    }
    throw err;
  }
}
