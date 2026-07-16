import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class InitDataDto {
  @IsOptional()
  @IsString()
  initData?: string;
}

export class TakeMedicationDto extends InitDataDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tabletsCount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateMedicationDto extends InitDataDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  tabletsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  mgPerTablet?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  intervalDays?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateSettingsDto extends InitDataDto {
  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(23)
  @Type(() => Number)
  reminderHour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  @Type(() => Number)
  reminderMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  defaultInterval?: number;
}

export class CreateMedicationDto extends InitDataDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  tabletsCount!: number;

  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  mgPerTablet!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  intervalDays?: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class HistoryQueryDto extends InitDataDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  medicationId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDeleted?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onlyDeleted?: boolean;
}

export class ClearHistoryDto extends InitDataDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
