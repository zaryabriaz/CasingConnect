import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessActivity, MarketplaceProspectStatus, MemberRole } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminBusinessListItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: BusinessActivity, isArray: true }) activities!: BusinessActivity[];
  @ApiPropertyOptional({ nullable: true }) city!: string | null;
  @ApiProperty() country!: string;
  @ApiProperty() active!: boolean;
  @ApiProperty() publicSiteEnabled!: boolean;
  @ApiProperty() publicSitePublished!: boolean;
  @ApiProperty() memberCount!: number;
  @ApiProperty() createdAt!: string;
}

export class AdminBusinessMemberDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: MemberRole }) role!: MemberRole;
  @ApiPropertyOptional({ nullable: true }) title!: string | null;
  @ApiProperty() active!: boolean;
}

export class AdminBusinessDetailDto extends AdminBusinessListItemDto {
  @ApiPropertyOptional({ nullable: true }) legalName!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiProperty({ type: [AdminBusinessMemberDto] }) members!: AdminBusinessMemberDto[];
}

export class UpdateAdminBusinessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, the business can use Activate website in their portal. When false, Activate website is blocked and any live public site is unpublished.',
  })
  @IsOptional()
  @IsBoolean()
  publicSiteEnabled?: boolean;
}

export class AdminUserMembershipDto {
  @ApiProperty({ format: 'uuid' }) businessId!: string;
  @ApiProperty() businessName!: string;
  @ApiProperty({ enum: MemberRole }) role!: MemberRole;
  @ApiProperty() active!: boolean;
}

export class AdminUserListItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() isSuperAdmin!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ type: [AdminUserMembershipDto] }) memberships!: AdminUserMembershipDto[];
}

export class ImpersonateDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  businessId!: string;
}

export class ScrapeProspectsDto {
  @ApiProperty({ example: 'https://example.com/members' })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url!: string;
}

export class DiscoverProspectsDto {
  @ApiPropertyOptional({ example: 'natural sausage casing exporters Pakistan' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  query?: string;

  @ApiPropertyOptional({ default: 3, minimum: 1, maximum: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  limitQueries?: number;
}

export class UpdateProspectDto {
  @ApiPropertyOptional({ enum: MarketplaceProspectStatus })
  @IsOptional()
  @IsEnum(MarketplaceProspectStatus)
  status?: MarketplaceProspectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class MarketplaceProspectDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) country!: string | null;
  @ApiPropertyOptional({ nullable: true }) city!: string | null;
  @ApiPropertyOptional({ nullable: true }) website!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiProperty() sourceUrl!: string;
  @ApiPropertyOptional({ nullable: true }) sourceLabel!: string | null;
  @ApiPropertyOptional({ nullable: true }) snippet!: string | null;
  @ApiProperty({ enum: MarketplaceProspectStatus }) status!: MarketplaceProspectStatus;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty() createdAt!: string;
}
