import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor, Roles } from '../common/decorators';
import { CreateReceiptDto, ReceiptResponseDto, UpdateReceiptRateDto } from './dto';
import { ReceiptsService } from './receipts.service';

@ApiTags('receipts')
@ApiBearerAuth()
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Get('store')
  @ApiOperation({ summary: 'Bags and drums currently recorded in the store, with the quantity in each.' })
  store(@CurrentActor() actor: Actor) {
    return this.receipts.store(actor);
  }

  @Get()
  @ApiOperation({ summary: 'Material bought by this business: roda, 18/UP, or a quality.' })
  @ApiDataArray(ReceiptResponseDto)
  list(@CurrentActor() actor: Actor) {
    return this.receipts.list(actor);
  }

  @Post()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Record a purchase. The material becomes company-owned stock with its own reference.' })
  @ApiData(ReceiptResponseDto, 201)
  create(@CurrentActor() actor: Actor, @Body() dto: CreateReceiptDto) {
    return this.receipts.create(actor, dto);
  }

  @Patch(':id/rate')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Set or correct the purchase rate so Finance and Ledger can show the amount.' })
  @ApiData(ReceiptResponseDto)
  setRate(
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReceiptRateDto,
  ) {
    return this.receipts.setRate(actor, id, dto.rate);
  }
}
