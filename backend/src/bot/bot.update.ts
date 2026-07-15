import { Update, Start, Ctx, Command } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { AuthService } from '../auth/auth.service';
import { MedsService } from '../meds/meds.service';
import { UsersService } from '../users/users.service';
import { BotService } from './bot.service';

@Update()
export class BotUpdate {
  constructor(
    private readonly usersService: UsersService,
    private readonly botService: BotService,
    private readonly medsService: MedsService,
    private readonly authService: AuthService,
  ) {}

  private isOwner(ctx: Context): boolean {
    const id = ctx.from?.id;
    return Boolean(id && this.authService.isAllowed(id));
  }

  private async trackUser(ctx: Context) {
    const from = ctx.from;
    if (!from) {
      return null;
    }
    if (!this.authService.isAllowed(from.id)) {
      return null;
    }
    return this.usersService.upsertFromTelegram(from);
  }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    if (!this.isOwner(ctx)) {
      await ctx.reply('Этот бот личный. Доступ закрыт.');
      return;
    }

    await this.trackUser(ctx);
    const name = ctx.from?.first_name ?? 'друг';
    const url = this.botService.getWebAppUrl();

    if (!url) {
      await ctx.reply(
        `Привет, ${name}!\n\nЗадай WEBAPP_URL в backend/.env, чтобы открыть приложение.`,
      );
      return;
    }

    await ctx.reply(
      `Привет, ${name}!\n\nЭто приложение-напоминание о таблетках.\nОткрой его кнопкой ниже.`,
      Markup.inlineKeyboard([
        Markup.button.webApp('Открыть приложение', url),
      ]),
    );

    await ctx.reply(
      'Кнопка также в меню бота.',
      Markup.keyboard([Markup.button.webApp('Таблетки', url)])
        .resize()
        .persistent(),
    );
  }

  @Command('due')
  async onDue(@Ctx() ctx: Context) {
    if (!this.isOwner(ctx)) {
      await ctx.reply('Этот бот личный. Доступ закрыт.');
      return;
    }

    const user = await this.trackUser(ctx);
    if (!user || !ctx.from) {
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
            Markup.button.webApp('Отметить в приложении', url),
          ])
        : {}),
    });
  }
}
