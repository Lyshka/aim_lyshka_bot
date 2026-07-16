import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatYmd } from '../common/calendar';
import { PrismaService } from '../prisma/prisma.service';

function serializeDay(row: {
  id: string;
  day: string;
  steps: number | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  muscleMassKg: number | null;
  waterPercent: number | null;
  boneMassKg: number | null;
  bmi: number | null;
  source: string;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    day: row.day,
    steps: row.steps,
    weightKg: row.weightKg,
    bodyFatPercent: row.bodyFatPercent,
    muscleMassKg: row.muscleMassKg,
    waterPercent: row.waterPercent,
    boneMassKg: row.boneMassKg,
    bmi: row.bmi,
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
        lastWeightKg: withWeight[0]?.weightKg ?? null,
        lastSteps: withSteps[0]?.steps ?? null,
      },
    };
  }

  async upsertDay(
    userId: number,
    data: {
      day?: string;
      steps?: number;
      weightKg?: number;
      bodyFatPercent?: number;
      muscleMassKg?: number;
      waterPercent?: number;
      boneMassKg?: number;
      bmi?: number;
      source?: string;
    },
  ) {
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
              defaultInterval: 2,
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

    const payload = {
      steps: data.steps ?? existing?.steps ?? null,
      weightKg: data.weightKg ?? existing?.weightKg ?? null,
      bodyFatPercent: data.bodyFatPercent ?? existing?.bodyFatPercent ?? null,
      muscleMassKg: data.muscleMassKg ?? existing?.muscleMassKg ?? null,
      waterPercent: data.waterPercent ?? existing?.waterPercent ?? null,
      boneMassKg: data.boneMassKg ?? existing?.boneMassKg ?? null,
      bmi: data.bmi ?? existing?.bmi ?? null,
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
