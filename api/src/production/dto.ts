import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncomingMaterial } from '@prisma/client';
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class ProductionDayQueryDto {
  @ApiProperty({ example: '2026-10-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Casing type (sheep, beef, …). Defaults to the first active type.' })
  @IsOptional()
  @IsUUID()
  casingTypeId?: string;
}

export class ProductionOutputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  qualityId!: string;

  @ApiProperty({ example: '40' })
  @Matches(/^\d+(\.\d{1,3})?$/)
  quantity!: string;
}

export class ProductionPersonDto {
  @ApiProperty({ format: 'uuid', description: 'Team membership with the Worker role.' })
  @IsUUID()
  membershipId!: string;

  @ApiProperty({ type: [ProductionOutputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionOutputDto)
  outputs!: ProductionOutputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class SaveProductionDayDto {
  @ApiProperty({ example: '2026-10-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ format: 'uuid', description: 'Which casing type this day’s output belongs to.' })
  @IsUUID()
  casingTypeId!: string;

  @ApiProperty({ type: [ProductionPersonDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionPersonDto)
  people!: ProductionPersonDto[];
}

export class ConvertMaterialDto {
  @ApiProperty({ example: '2026-10-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  membershipId!: string;

  @ApiProperty({ enum: [IncomingMaterial.RODA, IncomingMaterial.EIGHTEEN_UP] })
  @IsEnum(IncomingMaterial)
  fromForm!: IncomingMaterial;

  @ApiProperty({ example: '50', description: 'Quantity of source form consumed from this worker.' })
  @Matches(/^\d+(\.\d{1,3})?$/)
  fromQuantity!: string;

  @ApiPropertyOptional({
    enum: [IncomingMaterial.EIGHTEEN_UP],
    description: 'Set to EIGHTEEN_UP for Roda → 18/UP. Omit when cutting to finished qualities.',
  })
  @ValidateIf((dto: ConvertMaterialDto) => !dto.outputs?.length)
  @IsEnum(IncomingMaterial)
  toForm?: IncomingMaterial;

  @ApiPropertyOptional({
    example: '40',
    description: 'Number of 18/UP hanks made. Required for Roda → 18/UP. Ignored when cutting to qualities.',
  })
  @ValidateIf((dto: ConvertMaterialDto) => dto.toForm === IncomingMaterial.EIGHTEEN_UP)
  @Matches(/^\d+(\.\d{1,3})?$/)
  toQuantity?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required when cutting to finished qualities.' })
  @ValidateIf((dto: ConvertMaterialDto) => Boolean(dto.outputs?.length))
  @IsUUID()
  casingTypeId?: string;

  @ApiPropertyOptional({
    type: [ProductionOutputDto],
    description: 'Quality hank lines when Work done is finished quality. Not used for 18/UP.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductionOutputDto)
  outputs?: ProductionOutputDto[];

  @ApiPropertyOptional({
    example: '15',
    description: 'Labour rate per hank. Amount = rate × 18/UP hanks, or rate × sum of quality hanks.',
  })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  labourRate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
