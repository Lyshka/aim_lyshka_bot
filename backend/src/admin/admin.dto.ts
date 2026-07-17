import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AdminInitDto {
  @IsOptional()
  @IsString()
  initData?: string;
}

export class AdminSearchDto extends AdminInitDto {
  @IsString()
  @MinLength(1)
  query!: string;
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
