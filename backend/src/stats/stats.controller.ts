import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { StatsLookupDto } from './stats.dto';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(
    private readonly authService: AuthService,
    private readonly statsService: StatsService,
  ) {}

  @Post('lookup')
  async lookup(@Body() dto: StatsLookupDto) {
    await this.authService.authenticateApp(dto.initData ?? '', 'stats');
    return this.statsService.lookup(dto.steamInput);
  }
}
