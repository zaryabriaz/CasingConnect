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
  AdminOutboundEmailDto,
  AdminUserListItemDto,
  DiscoverProspectsDto,
  ImpersonateDto,
  MarketplaceProspectDto,
  ScrapeProspectsDto,
  SendCampaignDto,
  SendMailboxDto,
  UpdateAdminBusinessDto,
  UpdateProspectDto,
} from './dto';
import { CampaignsService, type CampaignTemplateId } from './campaigns.service';
import { MailboxService } from './mailbox.service';
import { ProspectsService } from './prospects.service';

@ApiTags('admin')
@ApiBearerAuth()
@SuperAdmin()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly prospects: ProspectsService,
    private readonly campaigns: CampaignsService,
    private readonly mailbox: MailboxService,
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

  @Get('campaigns/templates')
  @ApiOperation({ summary: 'List outreach email templates for marketplace campaigns.' })
  campaignTemplates() {
    return this.campaigns.templates();
  }

  @Get('campaigns/preview')
  @ApiOperation({ summary: 'Preview an outreach email template.' })
  campaignPreview(
    @Query('template') template: CampaignTemplateId,
    @Query('companyName') companyName?: string,
    @Query('demoUrl') demoUrl?: string,
  ) {
    return this.campaigns.preview(template, companyName, demoUrl);
  }

  @Post('campaigns/send')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Send a campaign email to selected prospects and/or custom emails (max 25 total).',
  })
  sendCampaign(@Body() dto: SendCampaignDto) {
    return this.campaigns.send({
      ...dto,
      skipAlreadySent: dto.skipAlreadySent !== false,
    });
  }

  @Get('mailbox')
  @ApiOperation({ summary: 'List recent free-form emails sent from Admin Mailbox.' })
  @ApiDataArray(AdminOutboundEmailDto)
  listMailbox() {
    return this.mailbox.list();
  }

  @Post('mailbox/preview')
  @HttpCode(200)
  @ApiOperation({ summary: 'Preview branded HTML for a free-form mailbox message.' })
  mailboxPreview(@Body() dto: { subject?: string; body?: string }) {
    return this.mailbox.preview(dto.subject, dto.body);
  }

  @Post('mailbox/send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a free-form email from Admin Mailbox (max 25 recipients).' })
  sendMailbox(@CurrentActor() actor: Actor, @Body() dto: SendMailboxDto) {
    return this.mailbox.send(actor.userId, dto);
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
