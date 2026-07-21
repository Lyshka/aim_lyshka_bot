import { Module } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { AuthModule } from '../auth/auth.module';
import { FinanceAlphaClient } from './finance-alpha.client';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [AuthModule, AppsModule],
  controllers: [FinanceController],
  providers: [FinanceService, FinanceAlphaClient],
})
export class FinanceModule {}
