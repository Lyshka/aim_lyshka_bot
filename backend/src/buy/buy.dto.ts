import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class BuyInitDto {
  @IsOptional()
  @IsString()
  initData?: string;
}

export class BuyCreateListDto extends BuyInitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  shared?: boolean;
}

export class BuyJoinListDto extends BuyInitDto {
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  code!: string;
}

export class BuyListIdDto extends BuyInitDto {
  @IsString()
  @MinLength(1)
  listId!: string;
}

export class BuyRenameListDto extends BuyListIdDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;
}

export class BuyRemoveMemberDto extends BuyListIdDto {
  @Type(() => Number)
  @IsNumber()
  memberUserId!: number;
}

export class BuyAddItemDto extends BuyInitDto {
  @IsString()
  @MinLength(1)
  listId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  productUrl?: string;
}

export class BuyUpdateItemDto extends BuyInitDto {
  @IsString()
  @MinLength(1)
  itemId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  productUrl?: string;

  @IsOptional()
  @IsString()
  clearImage?: string;
}

export class BuyItemIdDto extends BuyInitDto {
  @IsString()
  @MinLength(1)
  itemId!: string;
}
