import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$/;
/** Allows diameter, grade, and shorthand like "26/28 A,AB,C". */
const QUALITY_CODE = /^[A-Za-z0-9][A-Za-z0-9 ./+,\-]{0,59}$/;

export class CreateCasingTypeDto {
  @ApiProperty({ example: 'BEEF' })
  @IsString()
  @Matches(CODE)
  code!: string;

  @ApiProperty({ example: 'Beef casing' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

export class UpdateCasingTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateQualityDto {
  @ApiProperty({
    example: '26/28',
    description: 'Diameter alone creates AB, A, and C. Also accepts 26/28 AB or 26/28 A,AB,C.',
  })
  @IsString()
  @Matches(QUALITY_CODE)
  code!: string;

  @ApiProperty({
    example: '26/28 A,AB,C',
    description: 'Same as code. Diameter expands to AB / A / C grades.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;
}

export class UpdateQualityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(QUALITY_CODE)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class QualityResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) casingTypeId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() active!: boolean;
}

export class CasingTypeResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() active!: boolean;
  @ApiProperty({ type: [QualityResponseDto] }) qualities!: QualityResponseDto[];
}

export class CreateUnitDto {
  @ApiProperty({ example: 'HANKS' })
  @IsString()
  @Matches(CODE)
  code!: string;

  @ApiProperty({ example: 'Hanks' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @ApiProperty({
    example: 'hanks',
    description: 'Yield is shown only when input and output share this group. Roda and hanks stay apart.',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,30}$/)
  comparableGroup!: string;
}

export class UpdateUnitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,30}$/)
  comparableGroup?: string;
}

export class UnitResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() comparableGroup!: string;
}

export class CreateMaterialCategoryDto {
  @ApiProperty({ example: 'Salted green' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @ApiPropertyOptional({
    example: 'SALTED',
    description: 'Optional code. Generated from the name when omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(CODE)
  code?: string;
}

export class UpdateMaterialCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class MaterialCategoryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() active!: boolean;
  @ApiProperty() requiresQuality!: boolean;
  @ApiProperty() system!: boolean;
}
