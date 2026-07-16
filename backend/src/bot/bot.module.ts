import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { AppsModule } from '../apps/apps.module';
import { MedsModule } from '../meds/meds.module';
import { UsersModule } from '../users/users.module';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';

@Module({
  imports: [
    UsersModule,
    MedsModule,
    AppsModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const token = configService.get<string>('TELEGRAM_BOT_TOKEN');
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN не задан');
        }
        return { token };
      },
    }),
  ],
  providers: [BotService, BotUpdate],
  exports: [BotService],
})
export class BotModule {}
