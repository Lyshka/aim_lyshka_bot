import { Module } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, AppsModule],
  controllers: [AdminController],
})
export class AdminModule {}
