import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { Actor } from '../common/actor';
import { ApiData, ApiDataPage } from '../common/api-docs';
import { CurrentActor, Roles } from '../common/decorators';
import { PartnerBodyDto, PartnerQueryDto, PartnerResponseDto, UpdatePartnerDto } from './dto';
import { PartnersService } from './partners.service';

@ApiTags('partners')
@ApiBearerAuth()
@Controller('partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  @ApiOperation({ summary: 'Partners for this business. One record can hold several roles. Filter with role and q.' })
  @ApiDataPage(PartnerResponseDto)
  list(@CurrentActor() actor: Actor, @Query() query: PartnerQueryDto) {
    return this.partners.list(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One partner in the current business.' })
  @ApiData(PartnerResponseDto)
  get(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.partners.get(actor, id);
  }

  @Post()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Add a partner. The same company can be a supplier and a customer.' })
  @ApiData(PartnerResponseDto, 201)
  create(@CurrentActor() actor: Actor, @Body() dto: PartnerBodyDto) {
    return this.partners.create(actor, dto);
  }

  @Patch(':id')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Update a partner or mark them inactive.' })
  @ApiData(PartnerResponseDto)
  update(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePartnerDto) {
    return this.partners.update(actor, id, dto);
  }
}
