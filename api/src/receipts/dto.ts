import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditInstrument, Destination, IncomingMaterial, PackageKind, PaymentMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
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

export class PackageLineDto {
  @ApiProperty({ enum: PackageKind })
  @IsEnum(PackageKind)
  kind!: PackageKind;

  @ApiProperty({ example: '12', description: 'The number marked on this bag or drum.' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  packageNumber!: string;

  @ApiProperty({ example: '50' })
  @Matches(/^\d+(\.\d{1,3})?$/)
  quantity!: string;
}

export class CreateReceiptDto {
  @ApiProperty({ example: '2026-10-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  partnerId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Sheep, beef, or another active casing type. Defaults to the first active type.',
  })
  @IsOptional()
  @IsUUID()
  casingTypeId?: string;

  @ApiProperty({ enum: IncomingMaterial, description: 'RODA, EIGHTEEN_UP for 18/UP, or QUALITY. The quantity is always a number.' })
  @IsEnum(IncomingMaterial)
  materialForm!: IncomingMaterial;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required when materialForm is QUALITY. Must belong to the casing type.' })
  @IsOptional()
  @IsUUID()
  qualityId?: string;

  @ApiProperty({ enum: Destination, description: 'FACTORY keeps the number at the factory. STORE requires each bag or drum.' })
  @IsEnum(Destination)
  destination!: Destination;

  @ApiPropertyOptional({ type: [PackageLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageLineDto)
  packages?: PackageLineDto[];

  @ApiProperty({ example: '40' })
  @Matches(/^\d+(\.\d{1,3})?$/)
  quantity!: string;

  @ApiProperty({ example: '1800', description: 'Required so the purchase amount posts to the party ledger.' })
  @Matches(/^\d+(\.\d{1,2})?$/)
  rate!: string;

  @ApiProperty({ enum: PaymentMode, description: 'Cash paid now, or credit (supplier balance / deferred).' })
  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @ApiPropertyOptional({ description: 'Person who received the cash. Required when paymentMode is CASH.' })
  @ValidateIf((dto: CreateReceiptDto) => dto.paymentMode === PaymentMode.CASH)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cashPaidTo?: string;

  @ApiPropertyOptional({
    enum: CreditInstrument,
    description: 'For CREDIT: NONE, CHEQUE, or OTHER paper/instrument given.',
  })
  @ValidateIf((dto: CreateReceiptDto) => dto.paymentMode === PaymentMode.CREDIT)
  @IsEnum(CreditInstrument)
  creditInstrument?: CreditInstrument;

  @ApiPropertyOptional({ description: 'Cheque number. Required when creditInstrument is CHEQUE.' })
  @ValidateIf((dto: CreateReceiptDto) => dto.paymentMode === PaymentMode.CREDIT && dto.creditInstrument === CreditInstrument.CHEQUE)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  chequeNumber?: string;

  @ApiPropertyOptional({ description: 'Bank name on the cheque. Required when creditInstrument is CHEQUE.' })
  @ValidateIf((dto: CreateReceiptDto) => dto.paymentMode === PaymentMode.CREDIT && dto.creditInstrument === CreditInstrument.CHEQUE)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional({ description: 'What was given when creditInstrument is OTHER (promissory note, etc.).' })
  @ValidateIf((dto: CreateReceiptDto) => dto.paymentMode === PaymentMode.CREDIT && dto.creditInstrument === CreditInstrument.OTHER)
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

export class UpdateReceiptRateDto {
  @ApiProperty({ example: '1800', description: 'Purchase rate so amount posts to Finance and Ledger.' })
  @Matches(/^\d+(\.\d{1,2})?$/)
  rate!: string;
}

export class ReceiptResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() date!: string;
  @ApiProperty() supplier!: string;
  @ApiProperty() material!: string;
  @ApiProperty({ enum: IncomingMaterial }) materialForm!: IncomingMaterial;
  @ApiProperty() quantity!: string;
  @ApiProperty() unit!: string;
  @ApiPropertyOptional({ nullable: true }) rate!: string | null;
  @ApiPropertyOptional({ nullable: true }) amount!: string | null;
  @ApiProperty() currency!: string;
  @ApiProperty() place!: string;
  @ApiProperty({ enum: Destination }) destination!: Destination;
  @ApiProperty({ enum: PaymentMode }) paymentMode!: PaymentMode;
  @ApiPropertyOptional({ nullable: true }) cashPaidTo!: string | null;
  @ApiProperty({ enum: CreditInstrument }) creditInstrument!: CreditInstrument;
  @ApiPropertyOptional({ nullable: true }) chequeNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) bankName!: string | null;
  @ApiPropertyOptional({ nullable: true }) instrumentNote!: string | null;
  @ApiProperty({ type: [PackageLineDto] }) packages!: PackageLineDto[];
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
}
