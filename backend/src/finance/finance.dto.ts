import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class FinanceInitDto {
  @IsOptional()
  @IsString()
  initData?: string;
}

export class FinanceCreateAccountDto extends FinanceInitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class FinanceUpdateAccountDto extends FinanceInitDto {
  @IsString()
  @MinLength(1)
  accountId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class FinanceDeleteAccountDto extends FinanceInitDto {
  @IsString()
  @MinLength(1)
  accountId!: string;
}

export class FinanceSetBalanceDto extends FinanceInitDto {
  @IsString()
  @MinLength(1)
  accountId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(8)
  currency!: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;
}

export class FinanceSetCashDto extends FinanceInitDto {
  @IsString()
  @MinLength(3)
  @MaxLength(8)
  currency!: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;
}

export class FinanceDeleteCashDto extends FinanceInitDto {
  @IsString()
  @MinLength(3)
  @MaxLength(8)
  currency!: string;
}

export class FinanceCreateDebtDto extends FinanceInitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  personName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(8)
  currency!: string;

  @IsIn(['i_owe', 'owed_to_me'])
  direction!: 'i_owe' | 'owed_to_me';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class FinanceUpdateDebtDto extends FinanceInitDto {
  @IsString()
  @MinLength(1)
  debtId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  personName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsIn(['i_owe', 'owed_to_me'])
  direction?: 'i_owe' | 'owed_to_me';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class FinanceDeleteDebtDto extends FinanceInitDto {
  @IsString()
  @MinLength(1)
  debtId!: string;
}
