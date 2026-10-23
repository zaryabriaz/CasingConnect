import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportMessageRole, SupportThreadStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class PostSupportMessageDto {
  @ApiProperty({ example: 'We need help setting up export documents.' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class SupportMessageDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ format: 'uuid' }) fromUserId!: string;
  @ApiProperty() fromUserName!: string;
  @ApiProperty({ enum: SupportMessageRole }) fromRole!: SupportMessageRole;
  @ApiProperty() createdAt!: string;
}

export class SupportThreadDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) businessId!: string;
  @ApiProperty() businessName!: string;
  @ApiPropertyOptional({ nullable: true }) businessCountry!: string | null;
  @ApiProperty({ enum: SupportThreadStatus }) status!: SupportThreadStatus;
  @ApiProperty() lastMessageAt!: string;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional({ type: [SupportMessageDto] }) messages?: SupportMessageDto[];
  @ApiPropertyOptional() lastMessagePreview?: string | null;
  @ApiPropertyOptional({ enum: SupportMessageRole, nullable: true })
  lastMessageRole?: SupportMessageRole | null;
  @ApiPropertyOptional() messageCount?: number;
}

export class UpdateSupportThreadDto {
  @ApiProperty({ enum: ['OPEN', 'CLOSED'] })
  @IsIn(['OPEN', 'CLOSED'])
  status!: SupportThreadStatus;
}

export class SupportMessagesQueryDto {
  @ApiPropertyOptional({
    description: 'ISO timestamp — return messages strictly after this time.',
  })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiPropertyOptional({ description: 'Message UUID — return messages after this id’s createdAt.' })
  @IsOptional()
  @IsUUID('4')
  afterId?: string;
}
