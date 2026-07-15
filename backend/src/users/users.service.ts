import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_MEDS = [
  {
    name: 'Ламотриджин',
    tabletsCount: 5,
    mgPerTablet: 250,
    intervalDays: 2,
    sortOrder: 1,
  },
  {
    name: 'Энкорат хроно',
    tabletsCount: 4,
    mgPerTablet: 300,
    intervalDays: 2,
    sortOrder: 2,
  },
  {
    name: 'Рисперидон',
    tabletsCount: 1,
    mgPerTablet: 4,
    intervalDays: 2,
    sortOrder: 3,
  },
] as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertFromTelegram(payload: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  }) {
    const id = BigInt(payload.id);

    const user = await this.prisma.user.upsert({
      where: { id },
      create: {
        id,
        username: payload.username,
        firstName: payload.first_name,
        lastName: payload.last_name,
        languageCode: payload.language_code,
        settings: {
          create: {
            defaultInterval: 2,
            reminderHour: 9,
            reminderMinute: 0,
            timezone: 'Europe/Moscow',
          },
        },
      },
      update: {
        username: payload.username,
        firstName: payload.first_name,
        lastName: payload.last_name,
        languageCode: payload.language_code,
      },
      include: { settings: true },
    });

    await this.ensureDefaultMedications(id);
    return user;
  }

  async ensureDefaultMedications(userId: bigint) {
    const count = await this.prisma.medication.count({ where: { userId } });
    if (count > 0) {
      return;
    }

    const now = new Date();
    await this.prisma.medication.createMany({
      data: DEFAULT_MEDS.map((med) => ({
        userId,
        name: med.name,
        tabletsCount: med.tabletsCount,
        mgPerTablet: med.mgPerTablet,
        intervalDays: med.intervalDays,
        sortOrder: med.sortOrder,
        nextDueAt: now,
      })),
    });
  }

  async findById(id: number | bigint) {
    return this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: { settings: true },
    });
  }
}
