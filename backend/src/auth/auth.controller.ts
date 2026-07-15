import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthTelegramDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  auth(@Body() dto: AuthTelegramDto) {
    return this.authService.authenticate(dto.initData ?? '');
  }
}
