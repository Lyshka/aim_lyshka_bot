import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  fetchPlayerSummary,
  resolveSteamId,
} from '../games/games.steam';

const CS_RANKS = [
  'Без звания',
  'Silver I',
  'Silver II',
  'Silver III',
  'Silver IV',
  'Silver Elite',
  'Silver Elite Master',
  'Gold Nova I',
  'Gold Nova II',
  'Gold Nova III',
  'Gold Nova Master',
  'Master Guardian I',
  'Master Guardian II',
  'Master Guardian Elite',
  'Distinguished Master Guardian',
  'Legendary Eagle',
  'Legendary Eagle Master',
  'Supreme Master First Class',
  'The Global Elite',
];

function rankName(value: number | null | undefined) {
  if (value == null || value <= 0) {
    return 'Без звания';
  }
  return CS_RANKS[value] ?? `Звание ${value}`;
}

function round(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return round(value <= 1 ? value * 100 : value, 1);
}

@Injectable()
export class StatsService {
  constructor(private readonly configService: ConfigService) {}

  private steamApiKey() {
    return (this.configService.get<string>('STEAM_API_KEY') ?? '').trim();
  }

  private faceitApiKey() {
    return (this.configService.get<string>('FACEIT_API_KEY') ?? '').trim();
  }

  async lookup(steamInput: string) {
    const steamKey = this.steamApiKey();
    if (!steamKey) {
      throw new BadRequestException('STEAM_API_KEY не настроен на сервере');
    }

    const steamId = await resolveSteamId(steamInput, steamKey);
    const [steam, leetify, faceit] = await Promise.all([
      this.fetchSteamBundle(steamId, steamKey),
      this.fetchLeetify(steamId),
      this.fetchFaceit(steamId),
    ]);

    if (!steam && !leetify && !faceit) {
      throw new NotFoundException('Не удалось найти статистику по этому профилю');
    }

    return {
      steamId,
      profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
      steam,
      leetify,
      faceit,
      sources: {
        steam: Boolean(steam),
        leetify: Boolean(leetify),
        faceit: Boolean(faceit),
        faceitConfigured: Boolean(this.faceitApiKey()),
      },
    };
  }

  private async fetchSteamBundle(steamId: string, apiKey: string) {
    try {
      const [summary, bans, playtime] = await Promise.all([
        fetchPlayerSummary(steamId, apiKey),
        this.fetchSteamBans(steamId, apiKey),
        this.fetchCs2Playtime(steamId, apiKey),
      ]);
      return {
        personaName: summary.personaName,
        avatarUrl: summary.avatarUrl,
        bans,
        cs2: playtime,
      };
    } catch {
      return null;
    }
  }

  private async fetchSteamBans(steamId: string, apiKey: string) {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${apiKey}&steamids=${steamId}`,
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      players?: {
        CommunityBanned?: boolean;
        VACBanned?: boolean;
        NumberOfVACBans?: number;
        DaysSinceLastBan?: number;
        NumberOfGameBans?: number;
        EconomyBan?: string;
      }[];
    };
    const player = data.players?.[0];
    if (!player) {
      return null;
    }
    return {
      vacBanned: Boolean(player.VACBanned),
      communityBanned: Boolean(player.CommunityBanned),
      numberOfVacBans: player.NumberOfVACBans ?? 0,
      numberOfGameBans: player.NumberOfGameBans ?? 0,
      daysSinceLastBan: player.DaysSinceLastBan ?? 0,
      economyBan: player.EconomyBan ?? 'none',
    };
  }

  private async fetchCs2Playtime(steamId: string, apiKey: string) {
    const response = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=0&include_played_free_games=1&appids_filter[0]=730`,
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      response?: {
        games?: { appid?: number; playtime_forever?: number; playtime_2weeks?: number }[];
      };
    };
    const game = data.response?.games?.find((item) => item.appid === 730);
    if (!game) {
      return { owned: false, hoursForever: null, hours2Weeks: null };
    }
    return {
      owned: true,
      hoursForever: round((game.playtime_forever ?? 0) / 60, 1),
      hours2Weeks: round((game.playtime_2weeks ?? 0) / 60, 1),
    };
  }

  private async fetchLeetify(steamId: string) {
    try {
      const response = await fetch(
        `https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${steamId}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; lyshka-service/1.0)',
          },
        },
      );
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as {
        privacy_mode?: string;
        name?: string;
        winrate?: number;
        total_matches?: number;
        first_match_date?: string;
        bans?: unknown[];
        ranks?: {
          leetify?: number | null;
          premier?: number | null;
          faceit?: number | null;
          faceit_elo?: number | null;
          wingman?: number | null;
          renown?: number | null;
          competitive?: { map_name?: string; rank?: number }[];
        };
        rating?: Record<string, number>;
        stats?: Record<string, number>;
        recent_matches?: {
          id?: string;
          finished_at?: string;
          data_source?: string;
          outcome?: string;
          rank?: number;
          map_name?: string;
          leetify_rating?: number;
          score?: number[];
          accuracy_head?: number;
          spray_accuracy?: number;
        }[];
      };

      if (data.privacy_mode && data.privacy_mode !== 'public' && !data.ranks) {
        return {
          available: false,
          privacyMode: data.privacy_mode,
        };
      }

      const competitive = (data.ranks?.competitive ?? [])
        .filter((item) => (item.rank ?? 0) > 0)
        .map((item) => ({
          map: item.map_name ?? '',
          rank: item.rank ?? 0,
          rankName: rankName(item.rank),
        }))
        .sort((a, b) => b.rank - a.rank);

      return {
        available: true,
        privacyMode: data.privacy_mode ?? 'public',
        name: data.name ?? null,
        winrate: pct(data.winrate),
        totalMatches: data.total_matches ?? 0,
        firstMatchDate: data.first_match_date ?? null,
        bansCount: Array.isArray(data.bans) ? data.bans.length : 0,
        ranks: {
          leetify: round(data.ranks?.leetify, 2),
          premier: data.ranks?.premier ?? null,
          faceitLevel: data.ranks?.faceit ?? null,
          faceitElo: data.ranks?.faceit_elo ?? null,
          wingman: data.ranks?.wingman ?? null,
          wingmanName: rankName(data.ranks?.wingman),
          renown: data.ranks?.renown ?? null,
          competitive,
        },
        rating: {
          aim: round(data.rating?.aim, 1),
          positioning: round(data.rating?.positioning, 1),
          utility: round(data.rating?.utility, 1),
          clutch: round(data.rating?.clutch, 3),
          opening: round(data.rating?.opening, 3),
          ctLeetify: round(data.rating?.ct_leetify, 3),
          tLeetify: round(data.rating?.t_leetify, 3),
        },
        stats: {
          headshotAccuracy: round(data.stats?.accuracy_head, 1),
          spottedAccuracy: round(data.stats?.accuracy_enemy_spotted, 1),
          sprayAccuracy: round(data.stats?.spray_accuracy, 1),
          reactionMs: round(data.stats?.reaction_time_ms, 0),
          preaim: round(data.stats?.preaim, 1),
          counterStrafe: round(data.stats?.counter_strafing_good_shots_ratio, 1),
          flashPerFlashbang: round(data.stats?.flashbang_hit_foe_per_flashbang, 2),
          heDamageAvg: round(data.stats?.he_foes_damage_avg, 1),
          tradeKillSuccess: round(data.stats?.trade_kills_success_percentage, 1),
          openingDuelCt: round(data.stats?.ct_opening_duel_success_percentage, 1),
          openingDuelT: round(data.stats?.t_opening_duel_success_percentage, 1),
        },
        recentMatches: (data.recent_matches ?? []).slice(0, 15).map((match) => ({
          id: match.id ?? '',
          finishedAt: match.finished_at ?? null,
          source: match.data_source ?? '',
          outcome: match.outcome ?? '',
          map: match.map_name ?? '',
          rank: match.rank ?? null,
          rankName: rankName(match.rank),
          leetifyRating: round(match.leetify_rating, 3),
          score: match.score ?? [],
          headshotAccuracy: round(match.accuracy_head, 1),
          sprayAccuracy: round(match.spray_accuracy, 1),
        })),
      };
    } catch {
      return null;
    }
  }

  private async fetchFaceit(steamId: string) {
    const apiKey = this.faceitApiKey();
    if (!apiKey) {
      return null;
    }

    try {
      const playerRes = await fetch(
        `https://open.faceit.com/data/v4/players?game_player_id=${steamId}&game=cs2`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        },
      );

      if (!playerRes.ok) {
        const fallback = await fetch(
          `https://open.faceit.com/data/v4/players?game_player_id=${steamId}&game=csgo`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/json',
            },
          },
        );
        if (!fallback.ok) {
          return null;
        }
        return this.serializeFaceitPlayer(await fallback.json(), apiKey);
      }

      return this.serializeFaceitPlayer(await playerRes.json(), apiKey);
    } catch {
      return null;
    }
  }

  private async serializeFaceitPlayer(raw: unknown, apiKey: string) {
    const player = raw as {
      player_id?: string;
      nickname?: string;
      avatar?: string;
      country?: string;
      steam_id_64?: string;
      faceit_url?: string;
      games?: Record<
        string,
        {
          skill_level?: number;
          faceit_elo?: number;
          region?: string;
          game_player_name?: string;
        }
      >;
    };

    if (!player.player_id) {
      return null;
    }

    const cs2 = player.games?.cs2 ?? null;
    const csgo = player.games?.csgo ?? null;
    const [statsCs2, statsCsgo, bans, history] = await Promise.all([
      this.fetchFaceitStats(player.player_id, 'cs2', apiKey),
      this.fetchFaceitStats(player.player_id, 'csgo', apiKey),
      this.fetchFaceitBans(player.player_id, apiKey),
      this.fetchFaceitHistory(player.player_id, cs2 ? 'cs2' : 'csgo', apiKey),
    ]);

    return {
      playerId: player.player_id,
      nickname: player.nickname ?? null,
      avatar: player.avatar ?? null,
      country: player.country ?? null,
      profileUrl: player.faceit_url
        ? player.faceit_url.replace('{lang}', 'en')
        : null,
      cs2: cs2
        ? {
            level: cs2.skill_level ?? null,
            elo: cs2.faceit_elo ?? null,
            region: cs2.region ?? null,
            name: cs2.game_player_name ?? null,
            stats: statsCs2,
          }
        : null,
      csgo: csgo
        ? {
            level: csgo.skill_level ?? null,
            elo: csgo.faceit_elo ?? null,
            region: csgo.region ?? null,
            name: csgo.game_player_name ?? null,
            stats: statsCsgo,
          }
        : null,
      bans,
      recentMatches: history,
    };
  }

  private async fetchFaceitStats(
    playerId: string,
    game: string,
    apiKey: string,
  ) {
    try {
      const response = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/stats/${game}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        },
      );
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as {
        lifetime?: Record<string, string | number>;
        segments?: {
          label?: string;
          mode?: string;
          stats?: Record<string, string | number>;
        }[];
      };
      const lifetime = data.lifetime ?? {};
      return {
        matches: lifetime['Matches'] ?? lifetime['matches'] ?? null,
        winRate: lifetime['Win Rate %'] ?? lifetime['Win Rate'] ?? null,
        avgKd: lifetime['Average K/D Ratio'] ?? lifetime['K/D Ratio'] ?? null,
        avgKr: lifetime['Average K/R Ratio'] ?? null,
        headshots: lifetime['Average Headshots %'] ?? lifetime['Headshots %'] ?? null,
        wins: lifetime['Wins'] ?? null,
        currentWinStreak: lifetime['Current Win Streak'] ?? null,
        longestWinStreak: lifetime['Longest Win Streak'] ?? null,
        recentResults: lifetime['Recent Results'] ?? null,
        raw: lifetime,
        maps: (data.segments ?? [])
          .filter((item) => item.mode === '5v5' || !item.mode)
          .slice(0, 12)
          .map((item) => ({
            label: item.label ?? '',
            matches: item.stats?.['Matches'] ?? null,
            winRate: item.stats?.['Win Rate %'] ?? null,
            avgKd: item.stats?.['Average K/D Ratio'] ?? null,
          })),
      };
    } catch {
      return null;
    }
  }

  private async fetchFaceitBans(playerId: string, apiKey: string) {
    try {
      const response = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/bans?offset=0&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        },
      );
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as {
        items?: {
          reason?: string;
          starts_at?: string;
          ends_at?: string;
          type?: string;
        }[];
      };
      return (data.items ?? []).map((item) => ({
        reason: item.reason ?? '',
        type: item.type ?? '',
        startsAt: item.starts_at ?? null,
        endsAt: item.ends_at ?? null,
      }));
    } catch {
      return [];
    }
  }

  private async fetchFaceitHistory(
    playerId: string,
    game: string,
    apiKey: string,
  ) {
    try {
      const response = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/history?game=${game}&offset=0&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        },
      );
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as {
        items?: {
          match_id?: string;
          game?: string;
          game_mode?: string;
          competition_name?: string;
          map?: string;
          started_at?: number;
          finished_at?: number;
          results?: { winner?: string; score?: Record<string, number> };
          teams?: Record<string, { players?: { player_id?: string }[] }>;
        }[];
      };
      return (data.items ?? []).map((item) => {
        const faction =
          Object.entries(item.teams ?? {}).find(([, team]) =>
            team.players?.some((p) => p.player_id === playerId),
          )?.[0] ?? null;
        const winner = item.results?.winner ?? null;
        return {
          matchId: item.match_id ?? '',
          game: item.game ?? game,
          mode: item.game_mode ?? '',
          competition: item.competition_name ?? '',
          map: item.map ?? '',
          startedAt: item.started_at
            ? new Date(item.started_at * 1000).toISOString()
            : null,
          finishedAt: item.finished_at
            ? new Date(item.finished_at * 1000).toISOString()
            : null,
          result:
            faction && winner
              ? faction === winner
                ? 'win'
                : 'loss'
              : null,
          score: item.results?.score ?? null,
        };
      });
    } catch {
      return [];
    }
  }
}

