import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessActivity } from '@prisma/client';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const HEX = /^#([0-9a-fA-F]{6})$/;

export class UpdatePublicSiteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  about?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  products?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  markets?: string | null;

  @ApiPropertyOptional({ example: '#0b342b' })
  @IsOptional()
  @IsString()
  @Matches(HEX, { message: 'primaryColor must be a hex colour like #0b342b' })
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#b8923f' })
  @IsOptional()
  @IsString()
  @Matches(HEX, { message: 'accentColor must be a hex colour like #b8923f' })
  accentColor?: string;
}

export class PublicSiteEditorDto {
  @ApiProperty() enabled!: boolean;
  @ApiProperty() published!: boolean;
  @ApiPropertyOptional({ nullable: true }) tagline!: string | null;
  @ApiPropertyOptional({ nullable: true }) headline!: string | null;
  @ApiPropertyOptional({ nullable: true }) about!: string | null;
  @ApiPropertyOptional({ nullable: true }) products!: string | null;
  @ApiPropertyOptional({ nullable: true }) markets!: string | null;
  @ApiProperty() primaryColor!: string;
  @ApiProperty() accentColor!: string;
  @ApiPropertyOptional({ nullable: true }) coverUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) logoUrl!: string | null;
  @ApiProperty({ type: [String] }) gallery!: string[];
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() country!: string;
  @ApiPropertyOptional({ nullable: true }) city!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional() publicUrl!: string;
}

export class PublicSiteListingDto {
  @ApiProperty() qualityText!: string;
  @ApiProperty() quantity!: string;
  @ApiProperty() unitLabel!: string;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional({ nullable: true }) pricePerUnit!: string | null;
  @ApiPropertyOptional({ nullable: true }) destinationHint!: string | null;
}

export class PublicSiteIndexDto {
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() updatedAt!: string;
}

export class PublicCompanySiteDto {
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: BusinessActivity, isArray: true }) activities!: BusinessActivity[];
  @ApiProperty() country!: string;
  @ApiPropertyOptional({ nullable: true }) city!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) tagline!: string | null;
  @ApiPropertyOptional({ nullable: true }) headline!: string | null;
  @ApiPropertyOptional({ nullable: true }) about!: string | null;
  @ApiPropertyOptional({ nullable: true }) products!: string | null;
  @ApiPropertyOptional({ nullable: true }) markets!: string | null;
  @ApiProperty() primaryColor!: string;
  @ApiProperty() accentColor!: string;
  @ApiPropertyOptional({ nullable: true }) coverUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) logoUrl!: string | null;
  @ApiProperty({ type: [String] }) gallery!: string[];
  @ApiProperty({ type: [PublicSiteListingDto] }) listings!: PublicSiteListingDto[];
}
