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

export type AdminOverview = {
  apps: PlatformApp[];
  users: AdminUser[];
};

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Ошибка ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type CatPost = {
  id: string;
  deliveryDate: string;
  imageUrl: string;
  text: string;
  createdAt: string;
  sentAt: string | null;
};

export type CatFeed = {
  today: CatPost;
  history: CatPost[];
};

export type HealthDay = {
  id: string;
  day: string;
  steps: number | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  leanBodyMassKg: number | null;
  muscleMassKg: number | null;
  waterPercent: number | null;
  boneMassKg: number | null;
  bmi: number | null;
  heightCm: number | null;
  distanceKm: number | null;
  flightsClimbed: number | null;
  restingEnergyKcal: number | null;
  activeEnergyKcal: number | null;
  walkingSpeedKmh: number | null;
  walkingStepLengthCm: number | null;
  walkingAsymmetryPercent: number | null;
  doubleSupportPercent: number | null;
  walkingSteadiness: string | null;
  headphoneLevel: string | null;
  sleepScore: number | null;
  source: string;
  updatedAt: string;
};

export type HealthOverview = {
  today: HealthDay | null;
  history: HealthDay[];
  ingestConfigured: boolean;
  stats: {
    daysTracked: number;
    lastWeightKg: number | null;
    lastSteps: number | null;
  };
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
  setGrant: (
    initData: string,
    data: { userId: number; appSlug: string; enabled: boolean },
  ) =>
    request<AdminOverview>('/api/admin/grants', {
      method: 'POST',
      body: JSON.stringify({ initData, ...data }),
    }),
  catsFeed: (initData: string) =>
    request<CatFeed>('/api/cats/feed', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  healthOverview: (initData: string) =>
    request<HealthOverview>('/api/health/overview', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  healthManual: (
    initData: string,
    data: {
      day?: string;
      steps?: number;
      weightKg?: number;
      bodyFatPercent?: number;
      bmi?: number;
      heightCm?: number;
      leanBodyMassKg?: number;
    },
  ) =>
    request<HealthDay>('/api/health/manual', {
      method: 'POST',
      body: JSON.stringify({ initData, ...data }),
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
