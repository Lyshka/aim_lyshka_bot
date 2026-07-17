import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class HealthInitDto {
  @IsOptional()
  @IsString()
  initData?: string;
}

export class HealthIngestDto {
  @IsString()
  @MinLength(8)
  token!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId!: number;

  @IsOptional()
  @IsString()
  day?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200000)
  @Type(() => Number)
  steps?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(400)
  @Type(() => Number)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(80)
  @Type(() => Number)
  bodyFatPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  leanBodyMassKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  muscleMassKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  waterPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(20)
  @Type(() => Number)
  boneMassKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(80)
  @Type(() => Number)
  bmi?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(250)
  @Type(() => Number)
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  @Type(() => Number)
  walkingSpeedKmh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  @Type(() => Number)
  walkingStepLengthCm?: number;

  @IsOptional()
  @IsString()
  source?: string;
}

export class HealthManualDto extends HealthInitDto {
  @IsOptional()
  @IsString()
  day?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200000)
  @Type(() => Number)
  steps?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(400)
  @Type(() => Number)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(80)
  @Type(() => Number)
  bodyFatPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(80)
  @Type(() => Number)
  bmi?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(250)
  @Type(() => Number)
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  leanBodyMassKg?: number;
}
