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

export class StudyCreateLinkDto extends StudyInitDto {
  @IsString()
  @MinLength(1)
  sectionId!: string;

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
