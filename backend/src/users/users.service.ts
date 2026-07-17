import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
            defaultInterval: 1,
            reminderHour: 12,
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

    return user;
  }

  async findById(id: number | bigint) {
    return this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: { settings: true },
    });
  }
}
