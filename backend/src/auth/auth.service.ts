import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { validateTelegramInitData } from './telegram-init-data';

function serializeUser(user: {
  id: bigint;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
}) {
  return {
    id: Number(user.id),
    username: user.username ?? undefined,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    languageCode: user.languageCode ?? undefined,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  getAllowedUserIds(): number[] {
    const raw =
      this.configService.get<string>('ALLOWED_USER_IDS') ||
      this.configService.get<string>('ADMIN_IDS') ||
      '';
    return raw
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  isAllowed(userId: number): boolean {
    const allowed = this.getAllowedUserIds();
    if (allowed.length === 0) {
      return false;
    }
    return allowed.includes(userId);
  }

  assertAllowed(userId: number) {
    if (!this.isAllowed(userId)) {
      throw new ForbiddenException('Доступ запрещён. Приложение только для владельца.');
    }
  }

  async authenticate(initData: string) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new UnauthorizedException('Токен бота не настроен');
    }

    if (!initData?.trim()) {
      throw new UnauthorizedException(
        'Открой приложение через кнопку бота в Telegram',
      );
    }

    const validated = validateTelegramInitData(initData, token);
    if (!validated) {
      throw new ForbiddenException('Невалидные данные Telegram WebApp');
    }

    this.assertAllowed(validated.user.id);

    const user = await this.usersService.upsertFromTelegram({
      id: validated.user.id,
      first_name: validated.user.first_name,
      last_name: validated.user.last_name,
      username: validated.user.username,
      language_code: validated.user.language_code,
    });

    return {
      user: {
        ...serializeUser(user),
        photoUrl: validated.user.photo_url,
        isPremium: Boolean(validated.user.is_premium),
      },
      mode: 'telegram' as const,
    };
  }
}
