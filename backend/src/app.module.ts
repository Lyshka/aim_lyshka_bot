import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module';
import { AppsModule } from './apps/apps.module';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { MedsModule } from './meds/meds.module';
import { PrismaModule } from './prisma/prisma.module';
import { RemindersModule } from './reminders/reminders.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AppsModule,
    UsersModule,
    AuthModule,
    MedsModule,
    AdminModule,
    BotModule,
    RemindersModule,
  ],
})
export class AppModule {}
