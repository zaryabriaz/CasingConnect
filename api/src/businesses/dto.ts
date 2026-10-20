import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessActivity, LocationKind, MemberRole } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateBusinessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalName?: string;

  @ApiPropertyOptional({ enum: BusinessActivity, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(BusinessActivity, { each: true })
  activities?: BusinessActivity[];

  @ApiPropertyOptional({ example: 'PKR' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class BusinessCountsDto {
  @ApiProperty() locations!: number;
  @ApiProperty() members!: number;
  @ApiProperty() partners!: number;
  @ApiProperty() qualities!: number;
}

export class BusinessResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) legalName!: string | null;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: BusinessActivity, isArray: true }) activities!: BusinessActivity[];
  @ApiProperty() currency!: string;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) address!: string | null;
  @ApiPropertyOptional({ nullable: true }) city!: string | null;
  @ApiProperty() country!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() active!: boolean;
  @ApiProperty() marketplaceEnabled!: boolean;
  @ApiPropertyOptional({ nullable: true }) marketplaceHeadline!: string | null;
  @ApiPropertyOptional({ nullable: true }) marketplaceBio!: string | null;
  @ApiProperty({ type: [String] }) marketplaceLanguages!: string[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class BusinessDetailDto extends BusinessResponseDto {
  @ApiProperty({ type: BusinessCountsDto })
  counts!: BusinessCountsDto;
}

export class CreateLocationDto {
  @ApiProperty({ example: 'Main processing yard' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: LocationKind })
  @IsEnum(LocationKind)
  kind!: LocationKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}

export class UpdateLocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: LocationKind })
  @IsOptional()
  @IsEnum(LocationKind)
  kind?: LocationKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class LocationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: LocationKind }) kind!: LocationKind;
  @ApiPropertyOptional({ nullable: true }) address!: string | null;
  @ApiPropertyOptional({ nullable: true }) city!: string | null;
  @ApiPropertyOptional({ nullable: true }) country!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiProperty() active!: boolean;
}

export class CreateMemberDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    description: 'Required for sign-in roles. Optional for WORKER — a local account is created when omitted.',
  })
  @ValidateIf((dto: CreateMemberDto) => dto.role !== MemberRole.WORKER || Boolean(dto.email?.trim()))
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Required when this email is not already a CasingConnect account (not needed for WORKER without email).',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @ApiProperty({ enum: MemberRole })
  @IsEnum(MemberRole)
  role!: MemberRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;
}

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: MemberRole })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class MemberResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: MemberRole }) role!: MemberRole;
  @ApiPropertyOptional({ nullable: true }) title!: string | null;
  @ApiProperty() active!: boolean;
}
