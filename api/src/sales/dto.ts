import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditInstrument, PaymentMode, SaleChannel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class SaleLineDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  casingTypeId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  qualityId!: string;

  @ApiProperty({ example: '40' })
  @Matches(/^\d+(\.\d{1,3})?$/)
  quantity!: string;

  @ApiPropertyOptional({ example: '2200' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  rate?: string;
}

export class CreateSaleDto {
  @ApiProperty({ example: '2026-10-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ format: 'uuid', description: 'Customer (partner) buying the qualities.' })
  @IsUUID()
  partnerId!: string;

  @ApiPropertyOptional({ enum: SaleChannel, default: SaleChannel.LOCAL })
  @IsOptional()
  @IsEnum(SaleChannel)
  channel?: SaleChannel;

  @ApiPropertyOptional({
    example: 'PKR',
    description: 'Defaults to business currency for Local, USD for Export when omitted.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'UAE', description: 'Destination country for Export sales.' })
  @ValidateIf((dto: CreateSaleDto) => dto.channel === SaleChannel.EXPORT)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  destinationCountry?: string;

  @ApiPropertyOptional({ example: 'BL-12345', description: 'BL / packing / export invoice reference.' })
  @ValidateIf((dto: CreateSaleDto) => dto.channel === SaleChannel.EXPORT)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  exportRef?: string;

  @ApiProperty({ type: [SaleLineDto], description: 'One or more qualities on this sale.' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines!: SaleLineDto[];

  @ApiProperty({ enum: PaymentMode })
  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @ApiPropertyOptional({ description: 'Person who received the cash. Required when paymentMode is CASH.' })
  @ValidateIf((dto: CreateSaleDto) => dto.paymentMode === PaymentMode.CASH)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cashPaidTo?: string;

  @ApiPropertyOptional({ enum: CreditInstrument })
  @ValidateIf((dto: CreateSaleDto) => dto.paymentMode === PaymentMode.CREDIT)
  @IsEnum(CreditInstrument)
  creditInstrument?: CreditInstrument;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateSaleDto) => dto.paymentMode === PaymentMode.CREDIT && dto.creditInstrument === CreditInstrument.CHEQUE)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  chequeNumber?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateSaleDto) => dto.paymentMode === PaymentMode.CREDIT && dto.creditInstrument === CreditInstrument.CHEQUE)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateSaleDto) => dto.paymentMode === PaymentMode.CREDIT && dto.creditInstrument === CreditInstrument.OTHER)
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

export class SaleLineResponseDto {
  @ApiProperty({ format: 'uuid' }) qualityId!: string;
  @ApiProperty({ format: 'uuid' }) casingTypeId!: string;
  @ApiProperty() quality!: string;
  @ApiProperty() casingType!: string;
  @ApiProperty() quantity!: string;
  @ApiProperty() unit!: string;
  @ApiPropertyOptional({ nullable: true }) rate!: string | null;
  @ApiPropertyOptional({ nullable: true }) amount!: string | null;
}

export class SaleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() date!: string;
  @ApiProperty() customer!: string;
  @ApiProperty({ enum: SaleChannel }) channel!: SaleChannel;
  @ApiProperty({ type: [SaleLineResponseDto] }) lines!: SaleLineResponseDto[];
  @ApiProperty() quantity!: string;
  @ApiPropertyOptional({ nullable: true }) amount!: string | null;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional({ nullable: true }) destinationCountry!: string | null;
  @ApiPropertyOptional({ nullable: true }) exportRef!: string | null;
  @ApiProperty({ enum: PaymentMode }) paymentMode!: PaymentMode;
  @ApiPropertyOptional({ nullable: true }) cashPaidTo!: string | null;
  @ApiProperty({ enum: CreditInstrument }) creditInstrument!: CreditInstrument;
  @ApiPropertyOptional({ nullable: true }) chequeNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) bankName!: string | null;
  @ApiPropertyOptional({ nullable: true }) instrumentNote!: string | null;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
}

export class AvailableQualityDto {
  @ApiProperty({ format: 'uuid' }) qualityId!: string;
  @ApiProperty() quality!: string;
  @ApiProperty({ format: 'uuid' }) casingTypeId!: string;
  @ApiProperty() casingType!: string;
  @ApiProperty() produced!: string;
  @ApiProperty() sold!: string;
  @ApiProperty() available!: string;
}
