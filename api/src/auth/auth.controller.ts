import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CaptchaService } from '../captcha/captcha.service';
import { Actor } from '../common/actor';
import { ApiData } from '../common/api-docs';
import { CurrentActor, Public } from '../common/decorators';
import { AuthService } from './auth.service';
import { AuthSessionDto, LoginDto, RegisterDto, SessionProfileDto, SwitchBusinessDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly captcha: CaptchaService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a person and their first business.' })
  @ApiData(AuthSessionDto, 201)
  register(@Body() dto: RegisterDto) {
    this.captcha.assertHoneypotEmpty(dto.website);
    this.captcha.verify(dto.captchaToken, dto.captchaAnswer);
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in and receive a token scoped to one business (or platform for super admin).' })
  @ApiData(AuthSessionDto)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The signed-in person, current business (if any), and other memberships.' })
  @ApiData(SessionProfileDto)
  me(@CurrentActor() actor: Actor) {
    return this.auth.me(actor.userId, actor.businessId, {
      isSuperAdmin: actor.isSuperAdmin,
      impersonating: actor.impersonating,
    });
  }

  @Post('switch-business')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a new token scoped to another business this person belongs to.' })
  @ApiData(AuthSessionDto)
  switchBusiness(@CurrentActor() actor: Actor, @Body() dto: SwitchBusinessDto) {
    return this.auth.switchBusiness(actor.userId, dto.businessId);
  }
}
