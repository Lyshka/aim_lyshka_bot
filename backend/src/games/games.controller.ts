import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { GamesInitDto, GamesLinkDto } from './games.dto';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(
    private readonly authService: AuthService,
    private readonly gamesService: GamesService,
  ) {}

  @Post('overview')
  async overview(@Body() dto: GamesInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'games',
    );
    return this.gamesService.overview(session.user.id);
  }

  @Post('link')
  async link(@Body() dto: GamesLinkDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'games',
    );
    return this.gamesService.linkProfile(session.user.id, dto.steamInput);
  }

  @Post('sync')
  async sync(@Body() dto: GamesInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'games',
    );
    return this.gamesService.resync(session.user.id);
  }
}
