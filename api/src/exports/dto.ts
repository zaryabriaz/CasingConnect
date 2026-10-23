import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportDocumentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ExportLineDto {
  @ApiProperty({ description: 'Quality / description' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  quantity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @ApiPropertyOptional({ description: 'Unit rate (invoice)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  rate?: string;

  @ApiPropertyOptional({ description: 'Line amount (invoice)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  amount?: string;

  @ApiPropertyOptional({ description: 'Packages / bags (packing list)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  packages?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  netWeight?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  grossWeight?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  marks?: string;
}

export class CreateExportDocumentDto {
  @ApiProperty({ enum: ExportDocumentType })
  @IsEnum(ExportDocumentType)
  type!: ExportDocumentType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  documentNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty()
  @IsDateString()
  documentDate!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  buyerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  buyerAddress?: string;

  @ApiPropertyOptional({ description: 'e.g. CIF Karachi / FOB' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  incoterms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  destinationCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  vesselOrFlight?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  containerNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ type: [ExportLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExportLineDto)
  lines!: ExportLineDto[];
}

export class ExportLetterheadDto {
  @ApiPropertyOptional({ nullable: true }) letterheadUrl!: string | null;
  @ApiProperty() businessName!: string;
}

export class ExportDocumentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ExportDocumentType }) type!: ExportDocumentType;
  @ApiProperty() documentNumber!: string;
  @ApiPropertyOptional({ nullable: true }) title!: string | null;
  @ApiProperty() buyerName!: string;
  @ApiPropertyOptional({ nullable: true }) buyerAddress!: string | null;
  @ApiProperty() documentDate!: string;
  @ApiProperty() pdfUrl!: string;
  @ApiProperty() createdAt!: string;
}
