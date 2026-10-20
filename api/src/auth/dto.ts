import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessActivity, MemberRole } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BusinessResponseDto } from '../businesses/dto';

export class RegisterDto {
  @ApiProperty({ example: 'Ayesha Khan' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'ayesha@example.com' })
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Al-Noor Casings' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  businessName!: string;

  @ApiProperty({ enum: BusinessActivity, isArray: true, example: ['PROCESSOR'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(BusinessActivity, { each: true })
  activities!: BusinessActivity[];

  @ApiPropertyOptional({ example: 'Sialkot' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ example: 'Pakistan' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ example: '+92 300 1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'USD', description: 'Preferred currency (especially for buyer-only accounts).' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

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

export class LoginDto {
  @ApiProperty({ example: 'owner@casingconnect.demo' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Use when this person belongs to more than one business.' })
  @IsOptional()
  @IsUUID()
  businessId?: string;
}

export class SwitchBusinessDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  businessId!: string;
}

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;
}

export class MembershipSummaryDto {
  @ApiProperty({ format: 'uuid' })
  businessId!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty({ enum: MemberRole })
  role!: MemberRole;
}

export class SessionProfileDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiPropertyOptional({ type: BusinessResponseDto, nullable: true })
  business!: BusinessResponseDto | null;

  @ApiPropertyOptional({ enum: MemberRole, nullable: true })
  role!: MemberRole | null;

  @ApiProperty({ type: [MembershipSummaryDto] })
  memberships!: MembershipSummaryDto[];

  @ApiProperty()
  @IsBoolean()
  isSuperAdmin!: boolean;

  @ApiProperty()
  @IsBoolean()
  impersonating!: boolean;
}

export class AuthSessionDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'Token lifetime in seconds.' })
  expiresIn!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiPropertyOptional({ type: BusinessResponseDto, nullable: true })
  business!: BusinessResponseDto | null;

  @ApiPropertyOptional({ enum: MemberRole, nullable: true })
  role!: MemberRole | null;

  @ApiProperty({ type: [MembershipSummaryDto] })
  memberships!: MembershipSummaryDto[];

  @ApiProperty()
  isSuperAdmin!: boolean;

  @ApiProperty()
  impersonating!: boolean;
}
