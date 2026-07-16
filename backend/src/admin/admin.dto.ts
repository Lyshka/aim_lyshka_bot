import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminInitDto {
  @IsOptional()
  @IsString()
  initData?: string;
}

export class SetGrantDto extends AdminInitDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId!: number;

  @IsString()
  appSlug!: string;

  @IsBoolean()
  enabled!: boolean;
}
