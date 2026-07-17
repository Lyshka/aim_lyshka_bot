import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Markup } from 'telegraf';
import { AppsService } from '../apps/apps.service';
import { BotService } from '../bot/bot.service';
import { formatYmd, localNowParts } from '../common/calendar';
import { PrismaService } from '../prisma/prisma.service';
import { fetchCatImage, inventUniqueText } from './cats.content';

function serializePost(post: {
  id: string;
  deliveryDate: string;
  imageUrl: string;
  text: string;
  createdAt: Date;
}) {
  return {
    id: post.id,
    deliveryDate: post.deliveryDate,
    imageUrl: post.imageUrl,
    text: post.text,
    createdAt: post.createdAt.toISOString(),
  };
}

function serializeSettings(
  settings: {
    catsReminderHour: number;
    catsReminderMinute: number;
    catsReminderChangedOn: string | null;
    timezone: string;
  },
  isAdmin: boolean,
) {
  const today = formatYmd(new Date(), settings.timezone || 'Europe/Moscow');
  return {
    reminderHour: settings.catsReminderHour,
    reminderMinute: settings.catsReminderMinute,
    timezone: settings.timezone,
    canChangeTime: isAdmin || settings.catsReminderChangedOn !== today,
  };
}

@Injectable()
export class CatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appsService: AppsService,
    private readonly botService: BotService,
  ) {}

  async ensureTodayPost(userId: number, timeZone = 'Europe/Moscow') {
    const uid = BigInt(userId);
    const deliveryDate = formatYmd(new Date(), timeZone);
    const existing = await this.prisma.catPost.findUnique({
      where: {
        userId_deliveryDate: {
          userId: uid,
          deliveryDate,
        },
      },
    });
    if (existing) {
      return existing;
    }

    const usedImages = await this.prisma.catPost.findMany({
      where: { userId: uid },
      select: { imageKey: true, textKey: true },
    });
    const imageKeys = new Set(usedImages.map((i) => i.imageKey));
    const textKeys = new Set(usedImages.map((i) => i.textKey));

    const image = await fetchCatImage(imageKeys);
    const cute = await inventUniqueText(textKeys);

    try {
      return await this.prisma.catPost.create({
        data: {
          userId: uid,
          deliveryDate,
          imageUrl: image.url,
          imageKey: image.id,
          text: cute.text,
          textKey: cute.textKey,
        },
      });
    } catch {
      const again = await this.prisma.catPost.findUnique({
        where: {
          userId_deliveryDate: {
            userId: uid,
            deliveryDate,
          },
        },
      });
      if (again) {
        return again;
      }
      throw new Error('Не удалось создать котика дня');
    }
  }

  private async getUserSettings(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: { settings: true },
    });
    if (!user?.settings) {
      throw new NotFoundException('Настройки не найдены');
    }
    return user.settings;
  }

  async feed(userId: number, from?: string, to?: string) {
    const settings = await this.getUserSettings(userId);
    const isAdmin = this.appsService.isAdmin(userId);
    const timeZone = settings.timezone || 'Europe/Moscow';
    const uid = BigInt(userId);
    const today = await this.ensureTodayPost(userId, timeZone);

    const where: {
      userId: bigint;
      deliveryDate?: { gte?: string; lte?: string };
    } = { userId: uid };
    if (from && to) {
      where.deliveryDate = { gte: from, lte: to };
    } else if (from) {
      where.deliveryDate = { gte: from };
    } else if (to) {
      where.deliveryDate = { lte: to };
    }

    const history = await this.prisma.catPost.findMany({
      where,
      orderBy: { deliveryDate: 'desc' },
      take: 120,
    });

    return {
      today: serializePost(today),
      history: history.map(serializePost),
      settings: serializeSettings(settings, isAdmin),
    };
  }

  async updateReminderTime(
    userId: number,
    hour: number,
    minute: number,
    isAdmin: boolean,
  ) {
    const settings = await this.getUserSettings(userId);
    const timeZone = settings.timezone || 'Europe/Moscow';
    const today = formatYmd(new Date(), timeZone);

    if (!isAdmin && settings.catsReminderChangedOn === today) {
      throw new ForbiddenException('Время можно менять только раз в день');
    }

    const reminderHour = Math.max(0, Math.min(23, hour));
    const reminderMinute = Math.max(0, Math.min(59, minute));

    const updated = await this.prisma.userSettings.update({
      where: { userId: BigInt(userId) },
      data: {
        catsReminderHour: reminderHour,
        catsReminderMinute: reminderMinute,
        ...(isAdmin ? {} : { catsReminderChangedOn: today }),
      },
    });

    return serializeSettings(updated, isAdmin);
  }

  async listSubscriberIds() {
    return this.appsService.listSubscriberIds('cats');
  }

  async deliverDue() {
    const subscribers = await this.listSubscriberIds();
    if (subscribers.length === 0) {
      return;
    }

    const webAppUrl = this.botService.getWebAppUrl();

    for (const userId of subscribers) {
      try {
        const settings = await this.getUserSettings(userId);
        const timeZone = settings.timezone || 'Europe/Moscow';
        const deliveryDate = formatYmd(new Date(), timeZone);

        if (settings.catsLastDeliveryDate === deliveryDate) {
          continue;
        }

        const local = localNowParts(timeZone);
        if (
          local.hour < settings.catsReminderHour ||
          (local.hour === settings.catsReminderHour &&
            local.minute < settings.catsReminderMinute)
        ) {
          continue;
        }

        const post = await this.ensureTodayPost(userId, timeZone);

        await this.botService.sendPhoto(
          userId,
          post.imageUrl,
          post.text,
          webAppUrl
            ? Markup.inlineKeyboard([
                Markup.button.webApp('Открыть Котики', webAppUrl),
              ])
            : undefined,
        );

        await this.prisma.userSettings.update({
          where: { userId: BigInt(userId) },
          data: { catsLastDeliveryDate: deliveryDate },
        });
      } catch {
        continue;
      }
    }
  }

  @Cron('*/15 * * * *')
  async scheduledCats() {
    await this.deliverDue();
  }
}
