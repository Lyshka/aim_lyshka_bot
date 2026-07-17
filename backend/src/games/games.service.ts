import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import {
  fetchGamesMeta,
  fetchOwnedGames,
  fetchPlayerSummary,
  fetchWishlist,
  parseSteamInput,
  resolveSteamId,
} from './games.steam';

function serializeProfile(profile: {
  id: string;
  steamId: string;
  vanityUrl: string | null;
  personaName: string;
  avatarUrl: string;
  active: boolean;
  lastSyncAt: Date | null;
}) {
  return {
    id: profile.id,
    steamId: profile.steamId,
    vanityUrl: profile.vanityUrl,
    personaName: profile.personaName || profile.steamId,
    avatarUrl: profile.avatarUrl,
    active: profile.active,
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

  private async setActiveProfile(userId: number, profileId: string) {
    const uid = BigInt(userId);
    await this.prisma.steamProfile.updateMany({
      where: { userId: uid },
      data: { active: false },
    });
    await this.prisma.steamProfile.updateMany({
      where: { id: profileId, userId: uid },
      data: { active: true },
    });
  }

  async overview(userId: number) {
    try {
      const uid = BigInt(userId);
      const profiles = await this.prisma.steamProfile.findMany({
        where: { userId: uid },
        orderBy: { createdAt: 'asc' },
      });

      const active = profiles.find((p) => p.active) ?? profiles[0] ?? null;

      if (active && !active.active) {
        await this.setActiveProfile(userId, active.id);
        active.active = true;
      }

      const games = active
        ? await this.prisma.steamWishlistGame.findMany({
            where: { steamProfileId: active.id },
            orderBy: [{ owned: 'asc' }, { priority: 'asc' }, { name: 'asc' }],
          })
        : [];

      const owned = games.filter((g) => g.owned);
      const missing = games.filter((g) => !g.owned);

      return {
        steamConfigured: Boolean(this.steamApiKey()),
        profiles: profiles.map(serializeProfile),
        profile: active ? serializeProfile(active) : null,
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
      const parsed = parseSteamInput(steamInput);
      const steamId = await resolveSteamId(steamInput, apiKey);
      const vanityUrl = parsed.vanity ?? null;
      const summary = await fetchPlayerSummary(steamId, apiKey);
      const uid = BigInt(userId);

      const existing = await this.prisma.steamProfile.findUnique({
        where: {
          userId_steamId: {
            userId: uid,
            steamId,
          },
        },
      });
      if (existing) {
        throw new BadRequestException('Этот Steam аккаунт уже добавлен');
      }

      const profile = await this.prisma.steamProfile.create({
        data: {
          userId: uid,
          steamId,
          vanityUrl,
          personaName: summary.personaName,
          avatarUrl: summary.avatarUrl,
          active: false,
        },
      });

      await this.setActiveProfile(userId, profile.id);
      await this.syncProfile(userId, profile.id, true);
      return this.overview(userId);
    } catch (err) {
      this.rethrowDbError(err);
    }
  }

  async selectProfile(userId: number, profileId: string) {
    try {
      const profile = await this.prisma.steamProfile.findFirst({
        where: { id: profileId, userId: BigInt(userId) },
      });
      if (!profile) {
        throw new NotFoundException('Аккаунт не найден');
      }
      await this.setActiveProfile(userId, profileId);
      return this.overview(userId);
    } catch (err) {
      this.rethrowDbError(err);
    }
  }

  async deleteProfile(userId: number, profileId: string) {
    try {
      const uid = BigInt(userId);
      const profile = await this.prisma.steamProfile.findFirst({
        where: { id: profileId, userId: uid },
      });
      if (!profile) {
        throw new NotFoundException('Аккаунт не найден');
      }

      await this.prisma.steamProfile.delete({ where: { id: profileId } });

      if (profile.active) {
        const next = await this.prisma.steamProfile.findFirst({
          where: { userId: uid },
          orderBy: { createdAt: 'asc' },
        });
        if (next) {
          await this.setActiveProfile(userId, next.id);
        }
      }

      return this.overview(userId);
    } catch (err) {
      this.rethrowDbError(err);
    }
  }

  async syncProfile(
    userId: number,
    profileId: string,
    required = false,
  ) {
    const apiKey = this.steamApiKey();
    const profile = await this.prisma.steamProfile.findFirst({
      where: { id: profileId, userId: BigInt(userId) },
    });
    if (!profile) {
      throw new NotFoundException('Аккаунт не найден');
    }

    const summary = await fetchPlayerSummary(profile.steamId, apiKey);

    let wishlist: Awaited<ReturnType<typeof fetchWishlist>>;
    try {
      wishlist = await fetchWishlist(profile.steamId);
    } catch (err) {
      if (required) {
        throw err;
      }
      wishlist = new Map();
    }

    let ownedGames: Awaited<ReturnType<typeof fetchOwnedGames>>;
    try {
      ownedGames = await fetchOwnedGames(profile.steamId, apiKey);
    } catch {
      ownedGames = new Map();
    }

    const wishlistIds = [...wishlist.keys()];
    const ownedIds = [...ownedGames.keys()];
    const keepIds = [...new Set([...wishlistIds, ...ownedIds])];
    const missingIds = wishlistIds.filter((id) => !ownedGames.has(id));
    const meta = await fetchGamesMeta(missingIds);
    const now = new Date();
    const uid = BigInt(userId);

    for (const appId of missingIds) {
      const entry = wishlist.get(appId);
      const details = meta.get(appId);
      await this.prisma.steamWishlistGame.upsert({
        where: {
          steamProfileId_appId: {
            steamProfileId: profile.id,
            appId,
          },
        },
        create: {
          userId: uid,
          steamProfileId: profile.id,
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
          steamProfileId_appId: {
            steamProfileId: profile.id,
            appId,
          },
        },
        create: {
          userId: uid,
          steamProfileId: profile.id,
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
        where: { steamProfileId: profile.id },
      });
    } else {
      await this.prisma.steamWishlistGame.deleteMany({
        where: {
          steamProfileId: profile.id,
          appId: { notIn: keepIds },
        },
      });
    }

    await this.prisma.steamProfile.update({
      where: { id: profile.id },
      data: {
        lastSyncAt: now,
        personaName: summary.personaName,
        avatarUrl: summary.avatarUrl,
      },
    });
  }

  @Cron('15 6 * * *', { timeZone: 'Europe/Moscow' })
  async dailySyncAll() {
    const profiles = await this.prisma.steamProfile.findMany({
      select: { id: true, userId: true },
    });
    for (const profile of profiles) {
      try {
        await this.syncProfile(Number(profile.userId), profile.id);
      } catch {
        continue;
      }
    }
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
