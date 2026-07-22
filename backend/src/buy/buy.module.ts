import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuyController } from './buy.controller';
import { BuyService } from './buy.service';

@Module({
  imports: [AuthModule],
  controllers: [BuyController],
  providers: [BuyService],
})
export class BuyModule {}
