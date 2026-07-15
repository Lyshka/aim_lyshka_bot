import { Module } from '@nestjs/common';
import { BotModule } from '../bot/bot.module';
import { MedsModule } from '../meds/meds.module';
import { RemindersService } from './reminders.service';

@Module({
  imports: [MedsModule, BotModule],
  providers: [RemindersService],
})
export class RemindersModule {}
