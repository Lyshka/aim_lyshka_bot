import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  formatYmd,
  nextDueFromTake,
  startOfNextLocalDay,
} from '../common/calendar';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { serializeIntake, serializeMedication } from './meds.serializer';

@Injectable()
export class MedsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private async timezone(userId: number) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: BigInt(userId) },
    });
    return settings?.timezone || 'Europe/Moscow';
  }

  async list(userId: number) {
    const timeZone = await this.timezone(userId);
    const meds = await this.prisma.medication.findMany({
      where: { userId: BigInt(userId) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const normalized = await Promise.all(
      meds.map((med) => this.normalizeMedicationSchedule(med, timeZone)),
    );
    return normalized.map((med) => serializeMedication(med, timeZone));
  }

  async overview(userId: number) {
    await this.usersService.ensureDefaultMedications(BigInt(userId));

    const [meds, settings, recentIntakes] = await Promise.all([
      this.list(userId),
      this.prisma.userSettings.findUnique({
        where: { userId: BigInt(userId) },
      }),
      this.prisma.medicationIntake.findMany({
        where: { userId: BigInt(userId), deletedAt: null },
        include: { medication: true },
        orderBy: { takenAt: 'desc' },
        take: 20,
      }),
    ]);

    const mutedUntil = settings?.notificationsMutedUntil ?? null;
    const mutedToday = Boolean(mutedUntil && mutedUntil.getTime() > Date.now());

    return {
      medications: meds,
      dueCount: meds.filter((m) => m.isDue).length,
      settings: settings
        ? {
            reminderHour: Math.max(settings.reminderHour, 12),
            reminderMinute: settings.reminderMinute,
            timezone: settings.timezone,
            defaultInterval: settings.defaultInterval,
            notificationsMutedUntil: mutedUntil?.toISOString() ?? null,
            mutedToday,
          }
        : {
            reminderHour: 12,
            reminderMinute: 0,
            timezone: 'Europe/Moscow',
            defaultInterval: 2,
            notificationsMutedUntil: null,
            mutedToday: false,
          },
      recentIntakes: recentIntakes.map(serializeIntake),
    };
  }

  async create(
    userId: number,
    data: {
      name: string;
      tabletsCount: number;
      mgPerTablet: number;
      intervalDays?: number;
      instructions?: string;
    },
  ) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: BigInt(userId) },
    });

    const med = await this.prisma.medication.create({
      data: {
        userId: BigInt(userId),
        name: data.name,
        tabletsCount: data.tabletsCount,
        mgPerTablet: data.mgPerTablet,
        intervalDays: data.intervalDays ?? settings?.defaultInterval ?? 2,
        instructions: data.instructions?.trim() ?? '',
        nextDueAt: new Date(),
        sortOrder: 100,
      },
    });

    return serializeMedication(med);
  }

  async update(
    userId: number,
    medicationId: string,
    data: {
      name?: string;
      tabletsCount?: number;
      mgPerTablet?: number;
      intervalDays?: number;
      instructions?: string;
      active?: boolean;
    },
  ) {
    const med = await this.getOwned(userId, medicationId);

    const updated = await this.prisma.medication.update({
      where: { id: med.id },
      data: {
        name: data.name,
        tabletsCount: data.tabletsCount,
        mgPerTablet: data.mgPerTablet,
        intervalDays: data.intervalDays,
        instructions:
          data.instructions === undefined
            ? undefined
            : data.instructions.trim(),
        active: data.active,
      },
    });

    return serializeMedication(updated);
  }

  async take(
    userId: number,
    medicationId: string,
    options?: { tabletsCount?: number; note?: string },
  ) {
    const med = await this.getOwned(userId, medicationId);
    const timeZone = await this.timezone(userId);
    const tablets = options?.tabletsCount ?? med.tabletsCount;
    const takenAt = new Date();
    const nextDueAt = nextDueFromTake(takenAt, med.intervalDays, timeZone);

    const [, intake] = await this.prisma.$transaction([
      this.prisma.medication.update({
        where: { id: med.id },
        data: {
          lastTakenAt: takenAt,
          nextDueAt,
        },
      }),
      this.prisma.medicationIntake.create({
        data: {
          userId: BigInt(userId),
          medicationId: med.id,
          takenAt,
          tabletsCount: tablets,
          mgPerTablet: med.mgPerTablet,
          totalMg: tablets * med.mgPerTablet,
          note: options?.note,
        },
        include: { medication: true },
      }),
    ]);

    const medications = await this.list(userId);
    return {
      intake: serializeIntake(intake),
      medications,
    };
  }

  async muteToday(userId: number) {
    const timeZone = await this.timezone(userId);
    const until = startOfNextLocalDay(new Date(), timeZone);

    const settings = await this.prisma.userSettings.upsert({
      where: { userId: BigInt(userId) },
      create: {
        userId: BigInt(userId),
        reminderHour: 12,
        reminderMinute: 0,
        defaultInterval: 2,
        timezone: timeZone,
        notificationsMutedUntil: until,
      },
      update: {
        notificationsMutedUntil: until,
      },
    });

    return {
      notificationsMutedUntil: settings.notificationsMutedUntil?.toISOString() ?? null,
      mutedToday: true,
    };
  }

  async unmute(userId: number) {
    const settings = await this.prisma.userSettings.upsert({
      where: { userId: BigInt(userId) },
      create: {
        userId: BigInt(userId),
        reminderHour: 12,
        reminderMinute: 0,
        defaultInterval: 2,
        notificationsMutedUntil: null,
      },
      update: {
        notificationsMutedUntil: null,
      },
    });

    return {
      notificationsMutedUntil: settings.notificationsMutedUntil?.toISOString() ?? null,
      mutedToday: false,
    };
  }

  async history(
    userId: number,
    options?: {
      from?: string;
      to?: string;
      medicationId?: string;
      limit?: number;
      includeDeleted?: boolean;
      onlyDeleted?: boolean;
    },
  ) {
    const takenAt: { gte?: Date; lte?: Date } = {};
    if (options?.from) {
      takenAt.gte = this.startOfDay(options.from);
    }
    if (options?.to) {
      takenAt.lte = this.endOfDay(options.to);
    }

    let deletedFilter: { deletedAt: null } | { deletedAt: { not: null } } | object =
      { deletedAt: null };
    if (options?.onlyDeleted) {
      deletedFilter = { deletedAt: { not: null } };
    } else if (options?.includeDeleted) {
      deletedFilter = {};
    }

    const intakes = await this.prisma.medicationIntake.findMany({
      where: {
        userId: BigInt(userId),
        ...deletedFilter,
        ...(options?.medicationId ? { medicationId: options.medicationId } : {}),
        ...(Object.keys(takenAt).length > 0 ? { takenAt } : {}),
      },
      include: { medication: true },
      orderBy: { takenAt: 'desc' },
      take: options?.limit ?? 100,
    });
    return intakes.map(serializeIntake);
  }

  async deleteIntake(userId: number, intakeId: string) {
    const intake = await this.getOwnedIntake(userId, intakeId);
    if (intake.deletedAt) {
      return serializeIntake(intake);
    }

    const updated = await this.prisma.medicationIntake.update({
      where: { id: intake.id },
      data: { deletedAt: new Date() },
      include: { medication: true },
    });
    return serializeIntake(updated);
  }

  async restoreIntake(userId: number, intakeId: string) {
    const intake = await this.getOwnedIntake(userId, intakeId);
    if (!intake.deletedAt) {
      return serializeIntake(intake);
    }

    const updated = await this.prisma.medicationIntake.update({
      where: { id: intake.id },
      data: { deletedAt: null },
      include: { medication: true },
    });
    return serializeIntake(updated);
  }

  async clearHistory(
    userId: number,
    options: { from?: string; to?: string },
  ) {
    if (!options.from && !options.to) {
      throw new BadRequestException('Укажите период удаления');
    }

    const takenAt: { gte?: Date; lte?: Date } = {};
    if (options.from) {
      takenAt.gte = this.startOfDay(options.from);
    }
    if (options.to) {
      takenAt.lte = this.endOfDay(options.to);
    }

    const result = await this.prisma.medicationIntake.updateMany({
      where: {
        userId: BigInt(userId),
        deletedAt: null,
        takenAt,
      },
      data: { deletedAt: new Date() },
    });

    return { ok: true, deleted: result.count };
  }

  async purgeDeleted(userId: number) {
    const result = await this.prisma.medicationIntake.deleteMany({
      where: {
        userId: BigInt(userId),
        deletedAt: { not: null },
      },
    });

    return { ok: true, deleted: result.count };
  }

  private startOfDay(value: string) {
    return new Date(`${value}T00:00:00`);
  }

  private endOfDay(value: string) {
    return new Date(`${value}T23:59:59.999`);
  }

  private async getOwnedIntake(userId: number, intakeId: string) {
    const intake = await this.prisma.medicationIntake.findUnique({
      where: { id: intakeId },
      include: { medication: true },
    });
    if (!intake) {
      throw new NotFoundException('Запись не найдена');
    }
    if (intake.userId !== BigInt(userId)) {
      throw new ForbiddenException('Нет доступа');
    }
    return intake;
  }

  async updateSettings(
    userId: number,
    data: {
      reminderHour?: number;
      reminderMinute?: number;
      defaultInterval?: number;
    },
  ) {
    const reminderHour =
      data.reminderHour === undefined
        ? undefined
        : Math.max(12, Math.min(23, data.reminderHour));

    const settings = await this.prisma.userSettings.upsert({
      where: { userId: BigInt(userId) },
      create: {
        userId: BigInt(userId),
        reminderHour: reminderHour ?? 12,
        reminderMinute: data.reminderMinute ?? 0,
        defaultInterval: data.defaultInterval ?? 2,
      },
      update: {
        reminderHour,
        reminderMinute: data.reminderMinute,
        defaultInterval: data.defaultInterval,
      },
    });

    return {
      reminderHour: Math.max(settings.reminderHour, 12),
      reminderMinute: settings.reminderMinute,
      timezone: settings.timezone,
      defaultInterval: settings.defaultInterval,
      notificationsMutedUntil:
        settings.notificationsMutedUntil?.toISOString() ?? null,
      mutedToday: Boolean(
        settings.notificationsMutedUntil &&
          settings.notificationsMutedUntil.getTime() > Date.now(),
      ),
    };
  }

  async findDueMedications() {
    const meds = await this.prisma.medication.findMany({
      where: { active: true },
      include: {
        user: { include: { settings: true } },
      },
      orderBy: { nextDueAt: 'asc' },
    });

    const due: typeof meds = [];

    for (const med of meds) {
      const timeZone = med.user.settings?.timezone || 'Europe/Moscow';
      const normalized = await this.normalizeMedicationSchedule(med, timeZone);
      const serialized = serializeMedication(normalized, timeZone);
      if (serialized.isDue) {
        due.push(normalized);
      }
    }

    return due;
  }

  private async normalizeMedicationSchedule<
    T extends {
      id: string;
      lastTakenAt: Date | null;
      intervalDays: number;
      nextDueAt: Date;
    },
  >(med: T, timeZone: string): Promise<T> {
    if (!med.lastTakenAt) {
      return med;
    }

    const expected = nextDueFromTake(
      med.lastTakenAt,
      med.intervalDays,
      timeZone,
    );
    const expectedYmd = formatYmd(expected, timeZone);
    const actualYmd = formatYmd(med.nextDueAt, timeZone);

    if (expectedYmd !== actualYmd || med.nextDueAt.getTime() !== expected.getTime()) {
      const updated = await this.prisma.medication.update({
        where: { id: med.id },
        data: { nextDueAt: expected },
      });
      return { ...med, nextDueAt: updated.nextDueAt };
    }

    return med;
  }

  private async getOwned(userId: number, medicationId: string) {
    const med = await this.prisma.medication.findUnique({
      where: { id: medicationId },
    });
    if (!med) {
      throw new NotFoundException('Препарат не найден');
    }
    if (med.userId !== BigInt(userId)) {
      throw new ForbiddenException('Нет доступа');
    }
    return med;
  }
}
