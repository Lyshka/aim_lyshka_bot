import { Update, Start, Ctx, Command } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { AppsService } from '../apps/apps.service';
import { MedsService } from '../meds/meds.service';
import { UsersService } from '../users/users.service';
import { BotService } from './bot.service';

@Update()
export class BotUpdate {
  constructor(
    private readonly usersService: UsersService,
    private readonly botService: BotService,
    private readonly medsService: MedsService,
    private readonly appsService: AppsService,
  ) {}

  private async trackUser(ctx: Context) {
    const from = ctx.from;
    if (!from) {
      return null;
    }
    return this.usersService.upsertFromTelegram(from);
  }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await this.trackUser(ctx);
    const name = ctx.from?.first_name ?? 'друг';
    const url = this.botService.getWebAppUrl();

    if (!url) {
      await ctx.reply(
        `Привет, ${name}!\n\nСервис ещё запускается. Попробуй через минуту.`,
      );
      return;
    }

    await this.botService.applyMenuButton(url);

    await ctx.reply(
      `Привет, ${name}!\n\nЭто lyshka-service — платформа приложений.\nОткрой лаунчер кнопкой ниже.`,
      Markup.inlineKeyboard([
        Markup.button.webApp('Открыть lyshka-service', url),
      ]),
    );

    await ctx.reply(
      'Кнопка также в меню бота.',
      Markup.keyboard([Markup.button.webApp('lyshka-service', url)])
        .resize()
        .persistent(),
    );
  }

  @Command('due')
  async onDue(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) {
      return;
    }

    const allowed = await this.appsService.hasAccess(from.id, 'meds');
    if (!allowed) {
      await ctx.reply('Нет доступа к lyshka-service.');
      return;
    }

    const user = await this.trackUser(ctx);
    if (!user) {
      return;
    }

    const meds = await this.medsService.list(Number(user.id));
    const due = meds.filter((m) => m.isDue);

    if (due.length === 0) {
      await ctx.reply('Сейчас ничего принимать не нужно.');
      return;
    }

    const lines = due.map(
      (med) => `• ${med.name}: ${med.tabletsCount} шт × ${med.mgPerTablet} мг`,
    );
    const url = this.botService.getWebAppUrl();

    await ctx.reply(['Сейчас нужно принять:', '', ...lines].join('\n'), {
      ...(url
        ? Markup.inlineKeyboard([
            Markup.button.webApp('Открыть lyshka-service', url),
          ])
        : {}),
    });
  }
}
