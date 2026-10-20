import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketplaceProspectStatus, TailoredSetupRequestStatus } from '@prisma/client';
import { AuthSessionDto } from '../auth/dto';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor, SuperAdmin } from '../common/decorators';
import {
  TailoredSetupRequestDto,
  UpdateTailoredSetupRequestDto,
} from '../setup-requests/dto';
import { SetupRequestsService } from '../setup-requests/setup-requests.service';
import { AdminService } from './admin.service';
import {
  AdminBusinessDetailDto,
  AdminBusinessListItemDto,
  AdminUserListItemDto,
  DiscoverProspectsDto,
  ImpersonateDto,
  MarketplaceProspectDto,
  ScrapeProspectsDto,
  UpdateAdminBusinessDto,
  UpdateProspectDto,
} from './dto';
import { ProspectsService } from './prospects.service';

@ApiTags('admin')
@ApiBearerAuth()
@SuperAdmin()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly prospects: ProspectsService,
    private readonly setupRequests: SetupRequestsService,
  ) {}

  @Get('businesses')
  @ApiOperation({ summary: 'List every business on the platform.' })
  @ApiDataArray(AdminBusinessListItemDto)
  listBusinesses() {
    return this.admin.listBusinesses();
  }

  @Get('businesses/:id')
  @ApiOperation({ summary: 'Business detail with members.' })
  @ApiData(AdminBusinessDetailDto)
  getBusiness(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getBusiness(id);
  }

  @Patch('businesses/:id')
  @ApiOperation({ summary: 'Activate or suspend a business.' })
  @ApiData(AdminBusinessListItemDto)
  updateBusiness(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminBusinessDto) {
    return this.admin.updateBusiness(id, dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'List every user on the platform.' })
  @ApiDataArray(AdminUserListItemDto)
  listUsers() {
    return this.admin.listUsers();
  }

  @Post('impersonate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Open a business as Owner-equivalent support access.' })
  @ApiData(AuthSessionDto)
  impersonate(@CurrentActor() actor: Actor, @Body() dto: ImpersonateDto) {
    return this.admin.impersonate(actor.userId, dto.businessId);
  }

  @Post('exit-impersonation')
  @HttpCode(200)
  @ApiOperation({ summary: 'Return from a business to the platform admin session.' })
  @ApiData(AuthSessionDto)
  exitImpersonation(@CurrentActor() actor: Actor) {
    return this.admin.exitImpersonation(actor.userId);
  }

  @Get('prospects')
  @ApiOperation({ summary: 'List company prospects discovered for Marketplace outreach.' })
  @ApiDataArray(MarketplaceProspectDto)
  listProspects(@Query('status') status?: MarketplaceProspectStatus) {
    return this.prospects.list(status);
  }

  @Post('prospects/scrape')
  @ApiOperation({ summary: 'Fetch a public HTML page and extract company-like names.' })
  scrapeProspects(@Body() dto: ScrapeProspectsDto) {
    return this.prospects.scrapeUrl(dto);
  }

  @Post('prospects/discover')
  @ApiOperation({ summary: 'Search the public web for natural-casing industry companies.' })
  discoverProspects(@Body() dto: DiscoverProspectsDto) {
    return this.prospects.discover(dto);
  }

  @Get('prospects/trade-countries')
  @ApiOperation({ summary: 'List the 20 major casing-trade countries used for seeding.' })
  tradeCountries() {
    return this.prospects.tradeCountries();
  }

  @Post('prospects/seed-trade-countries')
  @ApiOperation({ summary: 'Load verified natural casing companies from public industry sources.' })
  seedTradeCountries() {
    return this.prospects.seedTradeCountries();
  }

  @Patch('prospects/:id')
  @ApiOperation({ summary: 'Update a prospect status or contact fields.' })
  @ApiData(MarketplaceProspectDto)
  updateProspect(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProspectDto) {
    return this.prospects.update(id, dto);
  }

  @Delete('prospects/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a prospect.' })
  removeProspect(@Param('id', ParseUUIDPipe) id: string) {
    return this.prospects.remove(id);
  }

  @Get('setup-requests')
  @ApiOperation({ summary: 'List tailored setup requests and queries from the public form.' })
  @ApiDataArray(TailoredSetupRequestDto)
  listSetupRequests(@Query('status') status?: TailoredSetupRequestStatus) {
    return this.setupRequests.list(status);
  }

  @Patch('setup-requests/:id')
  @ApiOperation({ summary: 'Update status or admin notes on a setup request.' })
  @ApiData(TailoredSetupRequestDto)
  updateSetupRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTailoredSetupRequestDto,
  ) {
    return this.setupRequests.update(id, dto);
  }

  @Delete('setup-requests/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a setup request.' })
  removeSetupRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.setupRequests.remove(id);
  }
}
