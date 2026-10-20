import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ExpenseQueryDto {
  @ApiProperty({ example: '2026-10-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}

export class ExpenseLineDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'Salt for cleaning' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  particulars!: string;

  @ApiProperty({ example: 'Salt' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  category!: string;

  @ApiPropertyOptional({ example: '10', description: 'Number of salt bags. Used with rate for Salt.' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,3})?$/)
  bags?: string;

  @ApiPropertyOptional({ example: '450', description: 'Rate per salt bag.' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  rate?: string;

  @ApiProperty({ example: '4500', description: 'For Salt, amount is bags × rate when both are set.' })
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @ApiPropertyOptional({ example: 'Local shop' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  paidTo?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'When category is Labour, optional worker membership who was paid.',
  })
  @IsOptional()
  @IsUUID()
  membershipId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class SaveDayExpensesDto {
  @ApiProperty({ example: '2026-10-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ type: [ExpenseLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseLineDto)
  lines!: ExpenseLineDto[];
}

export class ExpenseResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() date!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() particulars!: string;
  @ApiProperty() category!: string;
  @ApiPropertyOptional({ nullable: true }) bags!: string | null;
  @ApiPropertyOptional({ nullable: true }) rate!: string | null;
  @ApiProperty() amount!: string;
  @ApiPropertyOptional({ nullable: true }) paidTo!: string | null;
  @ApiPropertyOptional({ nullable: true, format: 'uuid' }) membershipId!: string | null;
  @ApiPropertyOptional({ nullable: true }) workerName!: string | null;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
}

export class ExpenseWorkerDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class DayExpensesResponseDto {
  @ApiProperty() date!: string;
  @ApiProperty() total!: string;
  @ApiProperty({ type: [ExpenseResponseDto] }) lines!: ExpenseResponseDto[];
  @ApiProperty({ type: [ExpenseWorkerDto] }) workers!: ExpenseWorkerDto[];
}
