import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { AuthService } from '../auth/auth.service';
import { CatsService } from './cats.service';

class CatsInitDto {
  @IsOptional()
  @IsString()
  initData?: string;
}

@Controller('cats')
export class CatsController {
  constructor(
    private readonly authService: AuthService,
    private readonly catsService: CatsService,
  ) {}

  @Post('feed')
  async feed(@Body() dto: CatsInitDto) {
    await this.authService.authenticateApp(dto.initData ?? '', 'cats');
    return this.catsService.feed();
  }
}
