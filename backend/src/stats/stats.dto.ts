import { IsOptional, IsString, MinLength } from 'class-validator';

export class StatsLookupDto {
  @IsOptional()
  @IsString()
  initData?: string;

  @IsString()
  @MinLength(2)
  steamInput!: string;
}
