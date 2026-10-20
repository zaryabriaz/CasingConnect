import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { Actor } from '../common/actor';
import { CurrentActor, Roles } from '../common/decorators';
import { IssueToPersonDto, TransferToFactoryDto } from './dto';
import { StockService } from './stock.service';

@ApiTags('stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Full inventory: raw material by location (store / factory / workers) and finished qualities (produced / sold / available).',
  })
  overview(@CurrentActor() actor: Actor) {
    return this.stock.overview(actor);
  }

  @Get('factory')
  @ApiOperation({ summary: 'Factory material: available pool, bags on hand, and what was given to people.' })
  factory(@CurrentActor() actor: Actor) {
    return this.stock.factory(actor);
  }

  @Get('store-packages')
  @ApiOperation({ summary: 'Bags and drums still in the store, ready to transfer or issue.' })
  storePackages(@CurrentActor() actor: Actor) {
    return this.stock.storePackages(actor);
  }

  @Post('transfer-to-factory')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.ACCOUNTANT, MemberRole.SUPERVISOR)
  @ApiOperation({ summary: 'Move selected store bags or drums into the factory material pool.' })
  transferToFactory(@CurrentActor() actor: Actor, @Body() dto: TransferToFactoryDto) {
    return this.stock.transferToFactory(actor, dto);
  }

  @Post('issue')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.ACCOUNTANT, MemberRole.SUPERVISOR)
  @ApiOperation({ summary: 'Give factory material to people (e.g. Ahmed 100, Amjad 100).' })
  issueToPerson(@CurrentActor() actor: Actor, @Body() dto: IssueToPersonDto) {
    return this.stock.issueToPerson(actor, dto);
  }
}
