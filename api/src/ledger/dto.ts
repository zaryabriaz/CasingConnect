import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditInstrument, LedgerPaymentDirection } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateLedgerPaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  partnerId!: string;

  @ApiProperty({ example: '2026-10-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ enum: LedgerPaymentDirection })
  @IsEnum(LedgerPaymentDirection)
  direction!: LedgerPaymentDirection;

  @ApiProperty({ example: '5000.00' })
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @ApiPropertyOptional({ enum: CreditInstrument, description: 'NONE = cash, CHEQUE, or OTHER.' })
  @IsOptional()
  @IsEnum(CreditInstrument)
  method?: CreditInstrument;

  @ApiPropertyOptional({ description: 'Person who handled the cash.' })
  @ValidateIf((dto: CreateLedgerPaymentDto) => (dto.method ?? CreditInstrument.NONE) === CreditInstrument.NONE)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cashPaidTo?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateLedgerPaymentDto) => dto.method === CreditInstrument.CHEQUE)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  chequeNumber?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateLedgerPaymentDto) => dto.method === CreditInstrument.CHEQUE)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateLedgerPaymentDto) => dto.method === CreditInstrument.OTHER)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  instrumentNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class LedgerPartnerSummaryDto {
  @ApiProperty() partnerId!: string;
  @ApiProperty() partner!: string;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty() currency!: string;
  @ApiProperty({ description: 'Amount customer owes you (debit balance).' }) receivable!: string;
  @ApiProperty({ description: 'Amount you owe supplier (credit balance).' }) payable!: string;
  @ApiProperty({ description: 'Signed net: positive = Dr receivable, negative = Cr payable.' }) balance!: string;
  @ApiProperty() balanceSide!: 'DR' | 'CR' | 'NIL';
  @ApiProperty() entries!: number;
}

export class LedgerEntryDto {
  @ApiProperty() id!: string;
  @ApiProperty() date!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() type!: 'SALE' | 'PURCHASE' | 'PAYMENT';
  @ApiProperty() particulars!: string;
  @ApiPropertyOptional({ nullable: true }) debit!: string | null;
  @ApiPropertyOptional({ nullable: true }) credit!: string | null;
  @ApiProperty() balance!: string;
  @ApiProperty() balanceSide!: 'DR' | 'CR' | 'NIL';
}

export class LedgerAccountDto {
  @ApiProperty() partnerId!: string;
  @ApiProperty() partner!: string;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty() currency!: string;
  @ApiProperty() receivable!: string;
  @ApiProperty() payable!: string;
  @ApiProperty() balance!: string;
  @ApiProperty() balanceSide!: 'DR' | 'CR' | 'NIL';
  @ApiProperty({ type: [LedgerEntryDto] }) entries!: LedgerEntryDto[];
}

export class LedgerPaymentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() date!: string;
  @ApiProperty() partnerId!: string;
  @ApiProperty() partner!: string;
  @ApiProperty({ enum: LedgerPaymentDirection }) direction!: LedgerPaymentDirection;
  @ApiProperty() amount!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ enum: CreditInstrument }) method!: CreditInstrument;
  @ApiPropertyOptional({ nullable: true }) cashPaidTo!: string | null;
  @ApiPropertyOptional({ nullable: true }) chequeNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) bankName!: string | null;
  @ApiPropertyOptional({ nullable: true }) instrumentNote!: string | null;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
}
