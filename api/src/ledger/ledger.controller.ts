import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor, Roles } from '../common/decorators';
import {
  CreateLedgerPaymentDto,
  LedgerAccountDto,
  LedgerPartnerSummaryDto,
  LedgerPaymentResponseDto,
} from './dto';
import { LedgerService } from './ledger.service';

@ApiTags('ledger')
@ApiBearerAuth()
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get()
  @ApiOperation({ summary: 'Partner ledger balances (receivable / payable).' })
  @ApiDataArray(LedgerPartnerSummaryDto)
  summary(@CurrentActor() actor: Actor) {
    return this.ledger.summary(actor);
  }

  @Post('payments')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Record a payment received from or paid to a partner.' })
  @ApiData(LedgerPaymentResponseDto, 201)
  createPayment(@CurrentActor() actor: Actor, @Body() dto: CreateLedgerPaymentDto) {
    return this.ledger.createPayment(actor, dto);
  }

  @Get(':partnerId')
  @ApiOperation({ summary: 'Running debit/credit ledger for one partner.' })
  @ApiData(LedgerAccountDto)
  account(@CurrentActor() actor: Actor, @Param('partnerId', ParseUUIDPipe) partnerId: string) {
    return this.ledger.account(actor, partnerId);
  }
}
