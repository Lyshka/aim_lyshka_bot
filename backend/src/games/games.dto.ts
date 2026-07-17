import { IsOptional, IsString, MinLength } from 'class-validator';

export class GamesInitDto {
  @IsOptional()
  @IsString()
  initData?: string;
}

export class GamesLinkDto {
  @IsOptional()
  @IsString()
  initData?: string;

  @IsString()
  @MinLength(2)
  steamInput!: string;
}

export class GamesProfileDto {
  @IsOptional()
  @IsString()
  initData?: string;

  @IsString()
  @MinLength(1)
  profileId!: string;
}
