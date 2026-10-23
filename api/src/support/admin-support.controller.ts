import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor, SuperAdmin } from '../common/decorators';
import {
  PostSupportMessageDto,
  SupportMessageDto,
  SupportMessagesQueryDto,
  SupportThreadDto,
  UpdateSupportThreadDto,
} from './dto';
import { SupportService } from './support.service';

@ApiTags('admin-support')
@ApiBearerAuth()
@SuperAdmin()
@Controller('admin/support')
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get('threads')
  @ApiOperation({ summary: 'List company support chat threads.' })
  @ApiDataArray(SupportThreadDto)
  listThreads() {
    return this.support.listAdminThreads();
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Get a support thread with messages.' })
  @ApiData(SupportThreadDto)
  getThread(@Param('id', ParseUUIDPipe) id: string) {
    return this.support.getAdminThread(id);
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'Poll newer messages in a support thread.' })
  @ApiDataArray(SupportMessageDto)
  listMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SupportMessagesQueryDto,
  ) {
    return this.support.listAdminMessages(id, query);
  }

  @Post('threads/:id/messages')
  @ApiOperation({ summary: 'Reply to a company in support chat.' })
  @ApiData(SupportMessageDto, 201)
  postMessage(
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostSupportMessageDto,
  ) {
    return this.support.postAdminMessage(actor, id, dto);
  }

  @Patch('threads/:id')
  @ApiOperation({ summary: 'Open or close a support thread.' })
  @ApiData(SupportThreadDto)
  updateThread(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupportThreadDto) {
    return this.support.updateAdminThread(id, dto);
  }
}
