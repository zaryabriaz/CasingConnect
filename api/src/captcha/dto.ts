import { ApiProperty } from '@nestjs/swagger';

export class CaptchaChallengeDto {
  @ApiProperty()
  token!: string;

  @ApiProperty({ example: 'What is 4 + 7?' })
  question!: string;

  @ApiProperty({ example: 600 })
  expiresInSeconds!: number;
}
