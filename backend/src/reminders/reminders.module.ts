import { Module } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { BotModule } from '../bot/bot.module';
import { MedsModule } from '../meds/meds.module';
import { RemindersService } from './reminders.service';

@Module({
  imports: [MedsModule, BotModule, AppsModule],
  providers: [RemindersService],
})
export class RemindersModule {}
