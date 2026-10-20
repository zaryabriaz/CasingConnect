import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor } from '../common/actor';
import { ApiData } from '../common/api-docs';
import { CurrentActor } from '../common/decorators';
import { FinanceOverviewDto, FinanceQueryDto } from './dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Trading finance overview: receivable, payable, cash in/out, and simple P&L.',
  })
  @ApiData(FinanceOverviewDto)
  overview(@CurrentActor() actor: Actor, @Query() query: FinanceQueryDto) {
    return this.finance.overview(actor, query);
  }
}
