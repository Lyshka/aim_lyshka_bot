export type AppUser = {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
  isPremium?: boolean;
  isAdmin?: boolean;
};

export type PlatformApp = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
};

export type AuthResponse = {
  user: AppUser;
  apps: PlatformApp[];
  isAdmin: boolean;
  mode: 'telegram' | 'dev';
};

export type Medication = {
  id: string;
  name: string;
  tabletsCount: number;
  mgPerTablet: number;
  totalMg: number;
  intervalDays: number;
  instructions: string;
  active: boolean;
  nextDueAt: string;
  lastTakenAt: string | null;
  sortOrder: number;
  isDue: boolean;
  daysUntilDue: number;
};

export type Intake = {
  id: string;
  medicationId: string;
  medicationName?: string;
  takenAt: string;
  tabletsCount: number;
  mgPerTablet: number;
  totalMg: number;
  note: string | null;
  deletedAt: string | null;
  isDeleted: boolean;
};

export type Overview = {
  ownerUserId: number;
  medications: Medication[];
  dueCount: number;
  settings: {
    reminderHour: number;
    reminderMinute: number;
    timezone: string;
    defaultInterval: number;
    notificationsMutedUntil: string | null;
    mutedToday: boolean;
  } | null;
  recentIntakes: Intake[];
};

export type HistoryFilter = {
  from?: string;
  to?: string;
  medicationId?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
};

export type AdminUser = {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  isAdmin: boolean;
  grants: { appId: string; slug: string; name: string }[];
};

export type AdminSearch = {
  users: AdminUser[];
};

export type AdminOverview = {
  apps: PlatformApp[];
  users: AdminUser[];
};

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const raw = await response.text();
    try {
      const parsed = JSON.parse(raw) as { message?: string | string[] };
      if (parsed.message) {
        throw new Error(
          Array.isArray(parsed.message)
            ? parsed.message.join(', ')
            : parsed.message,
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message !== raw) {
        throw err;
      }
    }
    throw new Error(raw || `Ошибка ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type CatPost = {
  id: string;
  deliveryDate: string;
  imageUrl: string;
  text: string;
  createdAt: string;
};

export type CatsSettings = {
  reminderHour: number;
  reminderMinute: number;
  timezone: string;
  canChangeTime: boolean;
};

export type CatFeed = {
  today: CatPost;
  history: CatPost[];
  settings: CatsSettings;
};

export type SteamGame = {
  id: string;
  appId: string;
  name: string;
  imageUrl: string;
  owned: boolean;
  priority: number;
  addedAt: string | null;
  storeUrl: string;
  updatedAt: string;
};

export type SteamProfile = {
  id: string;
  steamId: string;
  vanityUrl: string | null;
  personaName: string;
  avatarUrl: string;
  active: boolean;
  profileUrl: string;
  lastSyncAt: string | null;
  lastInventorySyncAt: string | null;
  inventoryHidden: boolean;
  stats: {
    total: number;
    owned: number;
    missing: number;
    inventoryValueUsd: number;
    inventoryCount: number;
  };
};

export type GamesOverview = {
  steamConfigured: boolean;
  profiles: SteamProfile[];
  profile: SteamProfile | null;
  stats: {
    total: number;
    owned: number;
    missing: number;
    inventoryValueUsd: number;
    inventoryCount: number;
  };
  owned: SteamGame[];
  missing: SteamGame[];
};

export type InventoryItem = {
  id: string;
  name: string;
  marketHashName: string;
  iconUrl: string;
  amount: number;
  marketable: boolean;
  typeLabel: string;
  rarity: string;
  exterior: string;
  priceUsd: number | null;
  totalUsd: number | null;
};

export type InventoryOverview = {
  profile: SteamProfile | null;
  hidden: boolean;
  totalValueUsd: number;
  itemsCount: number;
  items: InventoryItem[];
};

export type StatsLookup = {
  steamId: string;
  profileUrl: string;
  steam: {
    personaName: string;
    avatarUrl: string;
    countryCode: string | null;
    createdAt: string | null;
    accountAgeDays: number | null;
    profileVisible: boolean;
    steamLevel: number | null;
    bans: {
      vacBanned: boolean;
      communityBanned: boolean;
      numberOfVacBans: number;
      numberOfGameBans: number;
      daysSinceLastBan: number;
      economyBan: string;
    } | null;
    cs2: {
      owned: boolean;
      hoursForever: number | null;
      hours2Weeks: number | null;
    } | null;
  } | null;
  leetify: {
    available: boolean;
    privacyMode?: string;
    name?: string | null;
    winrate?: number | null;
    totalMatches?: number;
    firstMatchDate?: string | null;
    bansCount?: number;
    ranks?: {
      leetify: number | null;
      premier: number | null;
      faceitLevel: number | null;
      faceitElo: number | null;
      wingman: number | null;
      wingmanName: string;
      renown: number | null;
      competitive: { map: string; rank: number; rankName: string }[];
    };
    rating?: {
      aim?: number | null;
      positioning?: number | null;
      utility?: number | null;
      clutch?: number | null;
      opening?: number | null;
      ctLeetify?: number | null;
      tLeetify?: number | null;
    };
    stats?: {
      headshotAccuracy?: number | null;
      spottedAccuracy?: number | null;
      sprayAccuracy?: number | null;
      reactionMs?: number | null;
      preaim?: number | null;
      counterStrafe?: number | null;
      flashPerFlashbang?: number | null;
      heDamageAvg?: number | null;
      tradeKillSuccess?: number | null;
      openingDuelCt?: number | null;
      openingDuelT?: number | null;
      kd?: number | null;
      adr?: number | null;
      kast?: number | null;
      dpr?: number | null;
    };
    recentMatches?: {
      id: string;
      finishedAt: string | null;
      source: string;
      outcome: string;
      map: string;
      rank: number | null;
      rankName: string;
      leetifyRating: number | null;
      score: number[];
      headshotAccuracy: number | null;
      sprayAccuracy: number | null;
    }[];
  } | null;
  faceit: {
    playerId: string;
    nickname: string | null;
    avatar: string | null;
    country: string | null;
    profileUrl: string | null;
    cs2: {
      level: number | null;
      elo: number | null;
      region: string | null;
      name: string | null;
      stats: {
        matches?: string | number | null;
        winRate?: string | number | null;
        avgKd?: string | number | null;
        avgKr?: string | number | null;
        headshots?: string | number | null;
        wins?: string | number | null;
        currentWinStreak?: string | number | null;
        longestWinStreak?: string | number | null;
        maps?: {
          label: string;
          matches: string | number | null;
          winRate: string | number | null;
          avgKd: string | number | null;
        }[];
      } | null;
    } | null;
    csgo: {
      level: number | null;
      elo: number | null;
      region: string | null;
      name: string | null;
      stats: {
        matches?: string | number | null;
        winRate?: string | number | null;
        avgKd?: string | number | null;
        avgKr?: string | number | null;
        headshots?: string | number | null;
        wins?: string | number | null;
        currentWinStreak?: string | number | null;
        longestWinStreak?: string | number | null;
        maps?: {
          label: string;
          matches: string | number | null;
          winRate: string | number | null;
          avgKd: string | number | null;
        }[];
      } | null;
    } | null;
    bans: {
      reason: string;
      type: string;
      startsAt: string | null;
      endsAt: string | null;
    }[];
    recentMatches: {
      matchId: string;
      game: string;
      mode: string;
      competition: string;
      map: string;
      startedAt: string | null;
      finishedAt: string | null;
      result: string | null;
      score: Record<string, number> | null;
    }[];
  } | null;
  trackers: {
    cs2tracker: string;
    csstats: string;
    csst: string;
    csrep: string;
    leetify: string;
    faceit: string | null;
  };
  sources: {
    steam: boolean;
    leetify: boolean;
    faceit: boolean;
    faceitConfigured: boolean;
  };
};

export type StudyItemUrl = {
  id: string;
  url: string;
  title: string | null;
  sortOrder: number;
};

export type StudyItem = {
  id: string;
  sectionId: string;
  title: string;
  note: string;
  sortOrder: number;
  urls: StudyItemUrl[];
};

export type StudySection = {
  id: string;
  title: string;
  sortOrder: number;
  items: StudyItem[];
};

export type StudyOverview = {
  sections: StudySection[];
  isAdmin: boolean;
};

export type StudyTrashSection = {
  id: string;
  title: string;
  deletedAt: string | null;
  itemsCount: number;
  urlsCount: number;
};

export type StudyTrashItem = {
  id: string;
  title: string;
  sectionTitle: string;
  deletedAt: string | null;
  urlsCount: number;
};

export type StudyTrashUrl = {
  id: string;
  url: string;
  title: string | null;
  host: string;
  itemTitle: string;
  sectionTitle: string;
  deletedAt: string | null;
};

export type StudyTrash = {
  sections: StudyTrashSection[];
  items: StudyTrashItem[];
  urls: StudyTrashUrl[];
};

export const api = {
  auth: (initData: string) =>
    request<AuthResponse>('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  adminOverview: (initData: string) =>
    request<AdminOverview>('/api/admin/overview', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  adminSearch: (initData: string, query: string) =>
    request<AdminSearch>('/api/admin/search', {
      method: 'POST',
      body: JSON.stringify({ initData, query }),
    }),
  setGrant: (
    initData: string,
    data: { userId: number; appSlug: string; enabled: boolean },
  ) =>
    request<AdminOverview>('/api/admin/grants', {
      method: 'POST',
      body: JSON.stringify({ initData, ...data }),
    }),
  catsFeed: (
    initData: string,
    filters?: { from?: string; to?: string },
  ) =>
    request<CatFeed>('/api/cats/feed', {
      method: 'POST',
      body: JSON.stringify({ initData, ...filters }),
    }),
  catsTime: (initData: string, data: { hour: number; minute: number }) =>
    request<CatsSettings>('/api/cats/time', {
      method: 'POST',
      body: JSON.stringify({ initData, ...data }),
    }),
  gamesOverview: (initData: string) =>
    request<GamesOverview>('/api/games/overview', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  gamesLink: (initData: string, steamInput: string) =>
    request<GamesOverview>('/api/games/link', {
      method: 'POST',
      body: JSON.stringify({ initData, steamInput }),
    }),
  gamesSelect: (initData: string, profileId: string) =>
    request<GamesOverview>('/api/games/select', {
      method: 'POST',
      body: JSON.stringify({ initData, profileId }),
    }),
  gamesDelete: (initData: string, profileId: string) =>
    request<GamesOverview>('/api/games/delete', {
      method: 'POST',
      body: JSON.stringify({ initData, profileId }),
    }),
  gamesSync: (initData: string) =>
    request<GamesOverview>('/api/games/sync', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  gamesInventory: (initData: string) =>
    request<InventoryOverview>('/api/games/inventory', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  statsLookup: (initData: string, steamInput: string) =>
    request<StatsLookup>('/api/stats/lookup', {
      method: 'POST',
      body: JSON.stringify({ initData, steamInput }),
    }),
  studyOverview: (initData: string) =>
    request<StudyOverview>('/api/study/overview', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  studyCreateSection: (initData: string, title: string) =>
    request<StudyOverview>('/api/study/sections/create', {
      method: 'POST',
      body: JSON.stringify({ initData, title }),
    }),
  studyUpdateSection: (
    initData: string,
    data: { sectionId: string; title: string },
  ) =>
    request<StudyOverview>('/api/study/sections/update', {
      method: 'POST',
      body: JSON.stringify({ initData, ...data }),
    }),
  studyDeleteSection: (initData: string, sectionId: string) =>
    request<StudyOverview>('/api/study/sections/delete', {
      method: 'POST',
      body: JSON.stringify({ initData, sectionId }),
    }),
  studyCreateItem: (
    initData: string,
    data: {
      sectionId: string;
      title: string;
      url?: string;
      urlTitle?: string;
      note?: string;
    },
  ) =>
    request<StudyOverview>('/api/study/items/create', {
      method: 'POST',
      body: JSON.stringify({ initData, ...data }),
    }),
  studyAddUrls: (
    initData: string,
    data: { itemId: string; url: string; title?: string },
  ) =>
    request<StudyOverview>('/api/study/items/add-urls', {
      method: 'POST',
      body: JSON.stringify({ initData, ...data }),
    }),
  studyDeleteItem: (initData: string, itemId: string) =>
    request<StudyOverview>('/api/study/items/delete', {
      method: 'POST',
      body: JSON.stringify({ initData, itemId }),
    }),
  studyDeleteUrl: (initData: string, urlId: string) =>
    request<StudyOverview>('/api/study/urls/delete', {
      method: 'POST',
      body: JSON.stringify({ initData, urlId }),
    }),
  studyTrash: (initData: string) =>
    request<StudyTrash>('/api/study/trash', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  studyRestoreSection: (initData: string, sectionId: string) =>
    request<StudyTrash>('/api/study/sections/restore', {
      method: 'POST',
      body: JSON.stringify({ initData, sectionId }),
    }),
  studyRestoreItem: (initData: string, itemId: string) =>
    request<StudyTrash>('/api/study/items/restore', {
      method: 'POST',
      body: JSON.stringify({ initData, itemId }),
    }),
  studyRestoreUrl: (initData: string, urlId: string) =>
    request<StudyTrash>('/api/study/urls/restore', {
      method: 'POST',
      body: JSON.stringify({ initData, urlId }),
    }),
  studyPurgeTrash: (initData: string) =>
    request<StudyTrash>('/api/study/trash/purge', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  overview: (initData: string) =>
    request<Overview>('/api/meds/overview', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  muteToday: (initData: string) =>
    request<{ notificationsMutedUntil: string | null; mutedToday: boolean }>(
      '/api/meds/mute-today',
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      },
    ),
  unmute: (initData: string) =>
    request<{ notificationsMutedUntil: string | null; mutedToday: boolean }>(
      '/api/meds/unmute',
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      },
    ),
  take: (initData: string, id: string) =>
    request<{ intake: Intake; medications: Medication[] }>(
      `/api/meds/${id}/take`,
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      },
    ),
  history: (initData: string, filter?: HistoryFilter) =>
    request<Intake[]>('/api/meds/history', {
      method: 'POST',
      body: JSON.stringify({ initData, ...filter }),
    }),
  deleteIntake: (initData: string, id: string) =>
    request<Intake>(`/api/meds/history/${id}/delete`, {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  restoreIntake: (initData: string, id: string) =>
    request<Intake>(`/api/meds/history/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  clearHistory: (initData: string, filter: { from?: string; to?: string }) =>
    request<{ ok: boolean; deleted: number }>('/api/meds/history/clear', {
      method: 'POST',
      body: JSON.stringify({ initData, ...filter }),
    }),
  purgeDeleted: (initData: string) =>
    request<{ ok: boolean; deleted: number }>('/api/meds/history/purge-deleted', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  createMed: (
    initData: string,
    data: {
      name: string;
      tabletsCount: number;
      mgPerTablet: number;
      intervalDays?: number;
      instructions?: string;
    },
  ) =>
    request<Medication>('/api/meds', {
      method: 'POST',
      body: JSON.stringify({ initData, ...data }),
    }),
  updateMed: (
    initData: string,
    id: string,
    data: Partial<{
      name: string;
      tabletsCount: number;
      mgPerTablet: number;
      intervalDays: number;
      instructions: string;
      active: boolean;
    }>,
  ) =>
    request<Medication>(`/api/meds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ initData, ...data }),
    }),
  updateSettings: (
    initData: string,
    data: Partial<{
      reminderHour: number;
      reminderMinute: number;
      defaultInterval: number;
    }>,
  ) =>
    request<Overview['settings']>('/api/meds/settings', {
      method: 'POST',
      body: JSON.stringify({ initData, ...data }),
    }),
};
