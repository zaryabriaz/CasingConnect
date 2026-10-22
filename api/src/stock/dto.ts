import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncomingMaterial, StockOpType } from '@prisma/client';
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
  ValidateNested,
} from 'class-validator';

export class TransferToFactoryDto {
  @ApiProperty({ example: '2026-10-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ type: [String], description: 'Store bag or drum ids to move into the factory pool.' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  packageIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class IssuePersonLineDto {
  @ApiProperty({ format: 'uuid', description: 'Team membership with the Worker role.' })
  @IsUUID()
  membershipId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Preferred. Material category from Catalogue.',
  })
  @IsOptional()
  @IsUUID()
  materialCategoryId?: string;

  @ApiPropertyOptional({
    enum: IncomingMaterial,
    description: 'Legacy fallback when materialCategoryId is omitted.',
  })
  @IsOptional()
  @IsEnum(IncomingMaterial)
  materialForm?: IncomingMaterial;

  @ApiProperty({ example: '100' })
  @Matches(/^\d+(\.\d{1,3})?$/)
  quantity!: string;
}

export class IssueToPersonDto {
  @ApiProperty({ example: '2026-10-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ type: [IssuePersonLineDto], description: 'Give factory material to Worker-role team members.' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IssuePersonLineDto)
  lines!: IssuePersonLineDto[];

  @ApiPropertyOptional({ type: [String], description: 'Optional whole bags or drums to assign with this issue.' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  packageIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class StockOperationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() date!: string;
  @ApiProperty({ enum: StockOpType }) type!: StockOpType;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
}
