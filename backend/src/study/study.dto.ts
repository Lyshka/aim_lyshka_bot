import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class StudyInitDto {
  @IsOptional()
  @IsString()
  initData?: string;
}

export class StudyCreateSectionDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;
}

export class StudyUpdateSectionDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  sectionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;
}

export class StudyDeleteSectionDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  sectionId!: string;
}

export class StudyCreateItemDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  sectionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(3, { each: true })
  @MaxLength(2000, { each: true })
  @Type(() => String)
  urls!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class StudyDeleteItemDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  itemId!: string;
}
