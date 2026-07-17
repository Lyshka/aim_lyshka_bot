import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CatsInitDto {
  @IsOptional()
  @IsString()
  initData?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class CatsTimeDto {
  @IsOptional()
  @IsString()
  initData?: string;

  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @IsInt()
  @Min(0)
  @Max(59)
  minute!: number;
}
