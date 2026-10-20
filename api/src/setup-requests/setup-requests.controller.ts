import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CaptchaService } from '../captcha/captcha.service';
import { ApiData } from '../common/api-docs';
import { Public } from '../common/decorators';
import { CreateTailoredSetupRequestDto, TailoredSetupRequestDto } from './dto';
import { SetupRequestsService } from './setup-requests.service';

@ApiTags('setup-requests')
@Controller('setup-requests')
export class SetupRequestsController {
  constructor(
    private readonly setupRequests: SetupRequestsService,
    private readonly captcha: CaptchaService,
  ) {}

  @Public()
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Submit a public request for a tailored CasingConnect setup.' })
  @ApiData(TailoredSetupRequestDto, 201)
  create(@Body() dto: CreateTailoredSetupRequestDto) {
    this.captcha.assertHoneypotEmpty(dto.website);
    this.captcha.verify(dto.captchaToken, dto.captchaAnswer);
    return this.setupRequests.create(dto);
  }
}
