import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MedsController } from './meds.controller';
import { MedsService } from './meds.service';

@Module({
  imports: [AuthModule],
  controllers: [MedsController],
  providers: [MedsService],
  exports: [MedsService],
})
export class MedsModule {}
