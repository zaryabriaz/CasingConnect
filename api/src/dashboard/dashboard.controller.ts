import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor } from '../common/actor';
import { CurrentActor } from '../common/decorators';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Business snapshot: store, today buying, today expenses, and recent activity.' })
  summary(@CurrentActor() actor: Actor) {
    return this.dashboard.summary(actor);
  }
}
