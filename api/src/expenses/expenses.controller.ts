import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { Actor } from '../common/actor';
import { ApiData } from '../common/api-docs';
import { CurrentActor, Roles } from '../common/decorators';
import { DayExpensesResponseDto, ExpenseQueryDto, SaveDayExpensesDto } from './dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'Daily expenses for one date, like one Excel sheet.' })
  @ApiData(DayExpensesResponseDto)
  day(@CurrentActor() actor: Actor, @Query() query: ExpenseQueryDto) {
    return this.expenses.day(actor, query);
  }

  @Put()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Save the whole day sheet. Add, update, or remove lines in one go.' })
  @ApiData(DayExpensesResponseDto)
  saveDay(@CurrentActor() actor: Actor, @Body() dto: SaveDayExpensesDto) {
    return this.expenses.saveDay(actor, dto);
  }
}
