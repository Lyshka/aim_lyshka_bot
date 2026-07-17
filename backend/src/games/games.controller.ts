import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { GamesInitDto, GamesLinkDto, GamesProfileDto } from './games.dto';
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

  @Post('select')
  async select(@Body() dto: GamesProfileDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'games',
    );
    return this.gamesService.selectProfile(session.user.id, dto.profileId);
  }

  @Post('delete')
  async remove(@Body() dto: GamesProfileDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'games',
    );
    return this.gamesService.deleteProfile(session.user.id, dto.profileId);
  }
}
