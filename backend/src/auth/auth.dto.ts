import { IsOptional, IsString } from 'class-validator';

export class AuthTelegramDto {
  @IsOptional()
  @IsString()
  initData?: string;
}
