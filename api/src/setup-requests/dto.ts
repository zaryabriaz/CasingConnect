import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TailoredSetupRequestStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTailoredSetupRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  country!: string;

  @ApiProperty({ description: 'What customisation or setup they need.' })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;

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

export class UpdateTailoredSetupRequestDto {
  @ApiPropertyOptional({ enum: TailoredSetupRequestStatus })
  @IsOptional()
  @IsEnum(TailoredSetupRequestStatus)
  status?: TailoredSetupRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class TailoredSetupRequestDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) companyName!: string | null;
  @ApiProperty() country!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ enum: TailoredSetupRequestStatus }) status!: TailoredSetupRequestStatus;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty() createdAt!: string;
}
