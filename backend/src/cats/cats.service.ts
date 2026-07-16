import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Markup } from 'telegraf';
import { AppsService } from '../apps/apps.service';
import { BotService } from '../bot/bot.service';
import { formatYmd } from '../common/calendar';
import { PrismaService } from '../prisma/prisma.service';
import { fetchCatImage, inventUniqueText } from './cats.content';

function serializePost(post: {
  id: string;
  deliveryDate: string;
  imageUrl: string;
  text: string;
  createdAt: Date;
  sentAt: Date | null;
}) {
  return {
    id: post.id,
    deliveryDate: post.deliveryDate,
    imageUrl: post.imageUrl,
    text: post.text,
    createdAt: post.createdAt.toISOString(),
    sentAt: post.sentAt?.toISOString() ?? null,
  };
}

@Injectable()
export class CatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appsService: AppsService,
    private readonly botService: BotService,
  ) {}

  async ensureTodayPost(timeZone = 'Europe/Moscow') {
    const deliveryDate = formatYmd(new Date(), timeZone);
    const existing = await this.prisma.catPost.findUnique({
      where: { deliveryDate },
    });
    if (existing) {
      return existing;
    }

    const usedImages = await this.prisma.catPost.findMany({
      select: { imageKey: true, textKey: true },
    });
    const imageKeys = new Set(usedImages.map((i) => i.imageKey));
    const textKeys = new Set(usedImages.map((i) => i.textKey));

    const image = await fetchCatImage(imageKeys);
    const cute = await inventUniqueText(textKeys);

    try {
      return await this.prisma.catPost.create({
        data: {
          deliveryDate,
          imageUrl: image.url,
          imageKey: image.id,
          text: cute.text,
          textKey: cute.textKey,
        },
      });
    } catch {
      const again = await this.prisma.catPost.findUnique({
        where: { deliveryDate },
      });
      if (again) {
        return again;
      }
      throw new Error('Не удалось создать котика дня');
    }
  }

  async feed() {
    const today = await this.ensureTodayPost();
    const history = await this.prisma.catPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return {
      today: serializePost(today),
      history: history.map(serializePost),
    };
  }

  async listSubscriberIds() {
    const app = await this.prisma.app.findUnique({ where: { slug: 'cats' } });
    if (!app) {
      return [] as number[];
    }

    const grants = await this.prisma.userAppGrant.findMany({
      where: { appId: app.id },
      select: { userId: true },
    });
    const ids = new Set(grants.map((g) => Number(g.userId)));

    for (const adminId of this.appsService.getAdminIds()) {
      ids.add(adminId);
    }

    return [...ids];
  }

  async deliverToday() {
    const post = await this.ensureTodayPost();
    if (post.sentAt) {
      return post;
    }

    const subscribers = await this.listSubscriberIds();
    const webAppUrl = this.botService.getWebAppUrl();
    const caption = post.text;

    for (const userId of subscribers) {
      try {
        await this.botService.sendPhoto(
          userId,
          post.imageUrl,
          caption,
          webAppUrl
            ? Markup.inlineKeyboard([
                Markup.button.webApp('Открыть Котики', webAppUrl),
              ])
            : undefined,
        );
      } catch {
        continue;
      }
    }

    return this.prisma.catPost.update({
      where: { id: post.id },
      data: { sentAt: new Date() },
    });
  }

  @Cron('0 6 * * *', { timeZone: 'Europe/Moscow' })
  async morningCats() {
    await this.deliverToday();
  }
}
