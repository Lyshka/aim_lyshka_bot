import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
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

export class StudyLinkItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class StudyCreateLinksDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  sectionId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => StudyLinkItemDto)
  links!: StudyLinkItemDto[];
}

export class StudyUpdateLinkDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  linkId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  sectionId?: string;
}

export class StudyDeleteLinkDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  linkId!: string;
}
