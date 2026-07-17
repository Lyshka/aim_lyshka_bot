import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CatsInitDto, CatsTimeDto } from './cats.dto';
import { CatsService } from './cats.service';

@Controller('cats')
export class CatsController {
  constructor(
    private readonly authService: AuthService,
    private readonly catsService: CatsService,
  ) {}

  @Post('feed')
  async feed(@Body() dto: CatsInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'cats',
    );
    return this.catsService.feed(session.user.id, dto.from, dto.to);
  }

  @Post('time')
  async time(@Body() dto: CatsTimeDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'cats',
    );
    return this.catsService.updateReminderTime(
      session.user.id,
      dto.hour,
      dto.minute,
      session.isAdmin,
    );
  }
}
