import { Type } from 'class-transformer';
import {
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

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  urlTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class StudyUpdateItemDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  itemId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class StudyAddUrlsDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  itemId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

export class StudyDeleteItemDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  itemId!: string;
}

export class StudyDeleteUrlDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  urlId!: string;
}

export class StudyRestoreSectionDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  sectionId!: string;
}

export class StudyRestoreItemDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  itemId!: string;
}

export class StudyRestoreUrlDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  urlId!: string;
}
