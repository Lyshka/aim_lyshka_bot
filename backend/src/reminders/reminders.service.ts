import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Markup } from 'telegraf';
import { localNowParts } from '../common/calendar';
import { BotService } from '../bot/bot.service';
import { MedsService } from '../meds/meds.service';

@Injectable()
export class RemindersService {
  private readonly lastNotified = new Map<string, number>();

  constructor(
    private readonly medsService: MedsService,
    private readonly botService: BotService,
  ) {}

  @Cron('*/15 * * * *')
  async checkDue() {
    const due = await this.medsService.findDueMedications();
    if (due.length === 0) {
      return;
    }

    const byUser = new Map<string, typeof due>();
    for (const item of due) {
      const key = item.userId.toString();
      const list = byUser.get(key) ?? [];
      list.push(item);
      byUser.set(key, list);
    }

    const webAppUrl = this.botService.getWebAppUrl();
    const now = Date.now();

    for (const [userId, items] of byUser) {
      const settings = items[0]?.user.settings;
      const timeZone = settings?.timezone || 'Europe/Moscow';
      const mutedUntil = settings?.notificationsMutedUntil;
      if (mutedUntil && mutedUntil.getTime() > now) {
        continue;
      }

      const hour = Math.max(settings?.reminderHour ?? 12, 12);
      const minute = settings?.reminderMinute ?? 0;
      const local = localNowParts(timeZone);

      if (
        local.hour < hour ||
        (local.hour === hour && local.minute < minute)
      ) {
        continue;
      }

      const notifyKey = `${userId}:${items
        .map((i) => i.id)
        .sort()
        .join(',')}:${local.year}-${local.month}-${local.day}`;
      const last = this.lastNotified.get(notifyKey);
      if (last && now - last < 6 * 60 * 60 * 1000) {
        continue;
      }

      const lines = items.map(
        (med) =>
          `• ${med.name}: ${med.tabletsCount} шт × ${med.mgPerTablet} мг`,
      );

      const text = [
        'Напоминание: пора принять препараты',
        '',
        ...lines,
        '',
        'Отметь приём в приложении.',
      ].join('\n');

      const extra = webAppUrl
        ? Markup.inlineKeyboard([
            Markup.button.webApp('Открыть Таблетки', webAppUrl),
          ])
        : undefined;

      try {
        await this.botService.sendMessage(Number(userId), text, extra);
        this.lastNotified.set(notifyKey, now);
      } catch {
        continue;
      }
    }
  }
}
