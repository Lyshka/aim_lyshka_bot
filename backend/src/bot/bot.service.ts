import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { readFileSync, existsSync } from 'fs';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private cachedUrl: string | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly configService: ConfigService,
  ) {}

  private readUrlFromFile(): string | null {
    const filePath = this.configService.get<string>('WEBAPP_URL_FILE');
    if (!filePath || !existsSync(filePath)) {
      return null;
    }
    try {
      const value = readFileSync(filePath, 'utf8').trim();
      return value || null;
    } catch {
      return null;
    }
  }

  getWebAppUrl(): string | null {
    const fromFile = this.readUrlFromFile();
    if (fromFile) {
      this.cachedUrl = fromFile.replace(/\/$/, '');
      return this.cachedUrl;
    }

    const fromEnv = this.configService.get<string>('WEBAPP_URL')?.trim();
    if (!fromEnv) {
      return this.cachedUrl;
    }
    this.cachedUrl = fromEnv.replace(/\/$/, '');
    return this.cachedUrl;
  }

  getAdminIds(): number[] {
    const raw = this.configService.get<string>('ADMIN_IDS') ?? '';
    return raw
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  isAdmin(userId: number): boolean {
    const admins = this.getAdminIds();
    return admins.length === 0 || admins.includes(userId);
  }

  private async applyMenuButton(url: string) {
    try {
      await this.bot.telegram.setChatMenuButton({
        menuButton: {
          type: 'web_app',
          text: 'Таблетки',
          web_app: { url },
        },
      });
    } catch {
      return;
    }
  }

  async onModuleInit() {
    const url = this.getWebAppUrl();
    if (url) {
      await this.applyMenuButton(url);
    }

    this.timer = setInterval(() => {
      void this.syncWebAppUrl();
    }, 15000);
  }

  private async syncWebAppUrl() {
    const previous = this.cachedUrl;
    const next = this.getWebAppUrl();
    if (next && next !== previous) {
      await this.applyMenuButton(next);
    }
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async getMe() {
    return this.bot.telegram.getMe();
  }

  async sendMessage(
    chatId: number,
    text: string,
    extra?: Parameters<Telegraf['telegram']['sendMessage']>[2],
  ) {
    return this.bot.telegram.sendMessage(chatId, text, extra);
  }
}
