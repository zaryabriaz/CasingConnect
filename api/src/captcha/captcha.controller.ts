import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiData } from '../common/api-docs';
import { Public } from '../common/decorators';
import { CaptchaService } from './captcha.service';
import { CaptchaChallengeDto } from './dto';

@ApiTags('captcha')
@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captcha: CaptchaService) {}

  @Public()
  @Get('challenge')
  @ApiOperation({ summary: 'Create a free built-in captcha challenge for public forms.' })
  @ApiData(CaptchaChallengeDto)
  challenge() {
    return this.captcha.createChallenge();
  }
}
