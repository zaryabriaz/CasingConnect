import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor } from '../common/decorators';
import {
  PostSupportMessageDto,
  SupportMessageDto,
  SupportMessagesQueryDto,
  SupportThreadDto,
} from './dto';
import { SupportService } from './support.service';

@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('thread')
  @ApiOperation({ summary: 'Get or create this business’s support chat with CasingConnect admin.' })
  @ApiData(SupportThreadDto)
  getThread(@CurrentActor() actor: Actor) {
    return this.support.getOrCreateCompanyThread(actor);
  }

  @Get('thread/messages')
  @ApiOperation({ summary: 'Poll newer support messages for this business.' })
  @ApiDataArray(SupportMessageDto)
  listMessages(@CurrentActor() actor: Actor, @Query() query: SupportMessagesQueryDto) {
    return this.support.listCompanyMessages(actor, query);
  }

  @Post('thread/messages')
  @ApiOperation({ summary: 'Send a support message to CasingConnect admin.' })
  @ApiData(SupportMessageDto, 201)
  postMessage(@CurrentActor() actor: Actor, @Body() dto: PostSupportMessageDto) {
    return this.support.postCompanyMessage(actor, dto);
  }
}
