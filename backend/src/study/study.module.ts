import { Module } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { AuthModule } from '../auth/auth.module';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';

@Module({
  imports: [AuthModule, AppsModule],
  controllers: [StudyController],
  providers: [StudyService],
  exports: [StudyService],
})
export class StudyModule {}
