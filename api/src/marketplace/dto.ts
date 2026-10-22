import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessActivity, MarketplaceInquiryStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMarketplaceListingRequestDto {
  @ApiProperty({ description: 'Company name to show in the directory.' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  companyName!: string;

  @ApiProperty({ description: 'Contact person name.' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  contactName!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  country!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ description: 'Company website URL.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  companyWebsite?: string;

  @ApiProperty({ description: 'Short description for the directory (products, casings, markets).' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  about!: string;

  @ApiProperty({ description: 'Built-in captcha challenge token from GET /captcha/challenge.' })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  captchaToken!: string;

  @ApiProperty({ description: 'Answer to the captcha question.' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  captchaAnswer!: string;

  /** Honeypot — must be left empty. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class MarketplaceListingRequestResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() companyName!: string;
  @ApiProperty() message!: string;
}

export class MarketplaceBusinessQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ enum: BusinessActivity })
  @IsOptional()
  @IsEnum(BusinessActivity)
  activity?: BusinessActivity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

export class MarketplaceListingQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  quality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

export class UpdateMarketplaceProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketplaceEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  marketplaceHeadline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  marketplaceBio?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['en', 'ur'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketplaceLanguages?: string[];
}

export class CreateMarketplaceListingDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  casingTypeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  qualityId?: string;

  @ApiProperty({ example: '18/20' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  qualityText!: string;

  @ApiProperty({ example: '500' })
  @Matches(/^\d+(\.\d{1,3})?$/)
  quantity!: string;

  @ApiProperty({ example: 'hanks' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  unitLabel!: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency!: string;

  @ApiPropertyOptional({ example: '12.50' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  pricePerUnit?: string;

  @ApiPropertyOptional({ example: 'EU / Middle East' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  destinationHint?: string;
}

export class UpdateMarketplaceListingDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  casingTypeId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  qualityId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  qualityText?: string;

  @ApiPropertyOptional({ example: '500' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,3})?$/)
  quantity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  unitLabel?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: '12.50' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  pricePerUnit?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  destinationHint?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateMarketplaceInquiryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required when listingId is omitted.' })
  @IsOptional()
  @IsUUID()
  toBusinessId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  contactEmail?: string;
}

export class UpdateMarketplaceInquiryDto {
  @ApiProperty({ enum: MarketplaceInquiryStatus })
  @IsEnum(MarketplaceInquiryStatus)
  status!: MarketplaceInquiryStatus;
}

export class PublicMarketplaceBusinessDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: BusinessActivity, isArray: true }) activities!: BusinessActivity[];
  @ApiPropertyOptional({ nullable: true }) city!: string | null;
  @ApiProperty() country!: string;
  @ApiPropertyOptional({ nullable: true }) marketplaceHeadline!: string | null;
  @ApiPropertyOptional({ nullable: true }) marketplaceBio!: string | null;
  @ApiProperty({ type: [String] }) marketplaceLanguages!: string[];
  @ApiProperty() listingCount!: number;
  /** MEMBER = signed-up business; DIRECTORY = industry prospect (admin-loaded). */
  @ApiPropertyOptional({ enum: ['MEMBER', 'DIRECTORY'] })
  source?: 'MEMBER' | 'DIRECTORY';
  @ApiPropertyOptional({ nullable: true }) website?: string | null;
  @ApiPropertyOptional({ nullable: true }) email?: string | null;
  @ApiPropertyOptional({ nullable: true }) phone?: string | null;
}

export class MarketplaceListingResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) businessId!: string;
  @ApiProperty() businessName!: string;
  @ApiProperty() businessSlug!: string;
  @ApiProperty() country!: string;
  @ApiPropertyOptional({ nullable: true }) city!: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) casingTypeId!: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) qualityId!: string | null;
  @ApiProperty() qualityText!: string;
  @ApiProperty() quantity!: string;
  @ApiProperty() unitLabel!: string;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional({ nullable: true }) pricePerUnit!: string | null;
  @ApiPropertyOptional({ nullable: true }) destinationHint!: string | null;
  @ApiProperty() active!: boolean;
  @ApiProperty() createdAt!: string;
}

export class PublicMarketplaceProfileDto extends PublicMarketplaceBusinessDto {
  @ApiProperty({ type: [MarketplaceListingResponseDto] })
  listings!: MarketplaceListingResponseDto[];
}

export class MarketplaceInquiryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) listingId!: string | null;
  @ApiPropertyOptional({ nullable: true }) listingQualityText!: string | null;
  @ApiProperty({ format: 'uuid' }) toBusinessId!: string;
  @ApiProperty() toBusinessName!: string;
  @ApiProperty({ format: 'uuid' }) fromUserId!: string;
  @ApiProperty() fromUserName!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) fromBusinessId!: string | null;
  @ApiPropertyOptional({ nullable: true }) fromBusinessName!: string | null;
  @ApiProperty() message!: string;
  @ApiProperty() contactEmail!: string;
  @ApiProperty({ enum: MarketplaceInquiryStatus }) status!: MarketplaceInquiryStatus;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ enum: ['INBOX', 'SENT'] }) direction!: 'INBOX' | 'SENT';
}
