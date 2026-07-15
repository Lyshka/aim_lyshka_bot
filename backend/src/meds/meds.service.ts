import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { serializeIntake, serializeMedication } from './meds.serializer';

@Injectable()
export class MedsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number) {
    const meds = await this.prisma.medication.findMany({
      where: { userId: BigInt(userId) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return meds.map(serializeMedication);
  }

  async overview(userId: number) {
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

    return {
      medications: meds,
      dueCount: meds.filter((m) => m.isDue).length,
      settings: settings
        ? {
            reminderHour: settings.reminderHour,
            reminderMinute: settings.reminderMinute,
            timezone: settings.timezone,
            defaultInterval: settings.defaultInterval,
          }
        : null,
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
    const tablets = options?.tabletsCount ?? med.tabletsCount;
    const takenAt = new Date();
    const nextDueAt = new Date(
      takenAt.getTime() + med.intervalDays * 24 * 60 * 60 * 1000,
    );

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
    const settings = await this.prisma.userSettings.upsert({
      where: { userId: BigInt(userId) },
      create: {
        userId: BigInt(userId),
        reminderHour: data.reminderHour ?? 9,
        reminderMinute: data.reminderMinute ?? 0,
        defaultInterval: data.defaultInterval ?? 2,
      },
      update: {
        reminderHour: data.reminderHour,
        reminderMinute: data.reminderMinute,
        defaultInterval: data.defaultInterval,
      },
    });

    return {
      reminderHour: settings.reminderHour,
      reminderMinute: settings.reminderMinute,
      timezone: settings.timezone,
      defaultInterval: settings.defaultInterval,
    };
  }

  async findDueMedications() {
    return this.prisma.medication.findMany({
      where: {
        active: true,
        nextDueAt: { lte: new Date() },
      },
      include: {
        user: { include: { settings: true } },
      },
      orderBy: { nextDueAt: 'asc' },
    });
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
