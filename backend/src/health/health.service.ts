import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatYmd } from '../common/calendar';
import { PrismaService } from '../prisma/prisma.service';

type HealthPatch = {
  day?: string;
  steps?: number;
  weightKg?: number;
  bodyFatPercent?: number;
  leanBodyMassKg?: number;
  muscleMassKg?: number;
  waterPercent?: number;
  boneMassKg?: number;
  bmi?: number;
  heightCm?: number;
  walkingSpeedKmh?: number;
  walkingStepLengthCm?: number;
  source?: string;
};

function round2(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

function pickNumber(
  incoming: number | undefined,
  existing: number | null | undefined,
): number | null {
  if (incoming !== undefined) {
    return round2(incoming);
  }
  return existing ?? null;
}

function pickInt(
  incoming: number | undefined,
  existing: number | null | undefined,
): number | null {
  if (incoming !== undefined) {
    return Math.round(incoming);
  }
  return existing ?? null;
}

function serializeDay(row: {
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
  walkingSpeedKmh: number | null;
  walkingStepLengthCm: number | null;
  source: string;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    day: row.day,
    steps: row.steps,
    weightKg: round2(row.weightKg),
    bodyFatPercent: round2(row.bodyFatPercent),
    leanBodyMassKg: round2(row.leanBodyMassKg ?? row.muscleMassKg),
    muscleMassKg: round2(row.muscleMassKg),
    waterPercent: round2(row.waterPercent),
    boneMassKg: round2(row.boneMassKg),
    bmi: round2(row.bmi),
    heightCm: round2(row.heightCm),
    walkingSpeedKmh: round2(row.walkingSpeedKmh),
    walkingStepLengthCm: round2(row.walkingStepLengthCm),
    source: row.source,
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private ingestToken() {
    return this.configService.get<string>('HEALTH_INGEST_TOKEN')?.trim() ?? '';
  }

  assertIngestToken(token: string) {
    const expected = this.ingestToken();
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Неверный токен синхронизации');
    }
  }

  async overview(userId: number) {
    const timeZone = 'Europe/Moscow';
    const today = formatYmd(new Date(), timeZone);
    const rows = await this.prisma.healthDay.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { day: 'desc' },
      take: 30,
    });

    const todayRow = rows.find((r) => r.day === today) ?? null;
    const withWeight = rows.filter((r) => r.weightKg != null);
    const withSteps = rows.filter((r) => r.steps != null);

    return {
      today: todayRow ? serializeDay(todayRow) : null,
      history: rows.map(serializeDay),
      ingestConfigured: Boolean(this.ingestToken()),
      stats: {
        daysTracked: rows.length,
        lastWeightKg: round2(withWeight[0]?.weightKg ?? null),
        lastSteps: withSteps[0]?.steps ?? null,
      },
    };
  }

  async upsertDay(userId: number, data: HealthPatch) {
    const day = data.day?.trim() || formatYmd(new Date(), 'Europe/Moscow');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new ForbiddenException('Некорректная дата');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!existingUser) {
      await this.prisma.user.create({
        data: {
          id: BigInt(userId),
          settings: {
            create: {
              reminderHour: 12,
              reminderMinute: 0,
              defaultInterval: 1,
              timezone: 'Europe/Moscow',
            },
          },
        },
      });
    }

    const existing = await this.prisma.healthDay.findUnique({
      where: {
        userId_day: { userId: BigInt(userId), day },
      },
    });

    const lean =
      data.leanBodyMassKg !== undefined
        ? data.leanBodyMassKg
        : data.muscleMassKg !== undefined && data.leanBodyMassKg === undefined
          ? data.muscleMassKg
          : undefined;

    const payload = {
      steps: pickInt(data.steps, existing?.steps),
      weightKg: pickNumber(data.weightKg, existing?.weightKg),
      bodyFatPercent: pickNumber(data.bodyFatPercent, existing?.bodyFatPercent),
      leanBodyMassKg: pickNumber(lean, existing?.leanBodyMassKg),
      muscleMassKg: pickNumber(data.muscleMassKg, existing?.muscleMassKg),
      waterPercent: pickNumber(data.waterPercent, existing?.waterPercent),
      boneMassKg: pickNumber(data.boneMassKg, existing?.boneMassKg),
      bmi: pickNumber(data.bmi, existing?.bmi),
      heightCm: pickNumber(data.heightCm, existing?.heightCm),
      walkingSpeedKmh: pickNumber(
        data.walkingSpeedKmh,
        existing?.walkingSpeedKmh,
      ),
      walkingStepLengthCm: pickNumber(
        data.walkingStepLengthCm,
        existing?.walkingStepLengthCm,
      ),
      source: data.source ?? existing?.source ?? 'manual',
    };

    const row = await this.prisma.healthDay.upsert({
      where: {
        userId_day: { userId: BigInt(userId), day },
      },
      create: {
        userId: BigInt(userId),
        day,
        ...payload,
      },
      update: payload,
    });

    return serializeDay(row);
  }
}
