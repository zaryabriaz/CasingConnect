import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { CaptchaService } from '../captcha/captcha.service';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor, Public, Roles } from '../common/decorators';
import {
  CreateMarketplaceInquiryDto,
  CreateMarketplaceListingDto,
  CreateMarketplaceListingRequestDto,
  MarketplaceBusinessQueryDto,
  MarketplaceInquiryResponseDto,
  MarketplaceListingQueryDto,
  MarketplaceListingRequestResponseDto,
  MarketplaceListingResponseDto,
  PublicMarketplaceBusinessDto,
  PublicMarketplaceProfileDto,
  UpdateMarketplaceInquiryDto,
  UpdateMarketplaceListingDto,
  UpdateMarketplaceProfileDto,
} from './dto';
import { MarketplaceService } from './marketplace.service';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplace: MarketplaceService,
    private readonly captcha: CaptchaService,
  ) {}

  @Public()
  @Post('listing-requests')
  @HttpCode(201)
  @ApiOperation({
    summary:
      'Public form: request to list a natural casing company in the Marketplace directory.',
  })
  @ApiData(MarketplaceListingRequestResponseDto, 201)
  createListingRequest(@Body() dto: CreateMarketplaceListingRequestDto) {
    this.captcha.assertHoneypotEmpty(dto.website);
    this.captcha.verify(dto.captchaToken, dto.captchaAnswer);
    return this.marketplace.createListingRequest(dto);
  }

  @Public()
  @Get('businesses')
  @ApiOperation({ summary: 'Public directory of Marketplace-enabled businesses.' })
  @ApiDataArray(PublicMarketplaceBusinessDto)
  listBusinesses(@Query() query: MarketplaceBusinessQueryDto) {
    return this.marketplace.listBusinesses(query);
  }

  @Public()
  @Get('businesses/:slug')
  @ApiOperation({ summary: 'Public company profile with active listings.' })
  @ApiData(PublicMarketplaceProfileDto)
  getBusiness(@Param('slug') slug: string) {
    return this.marketplace.getBusinessBySlug(slug);
  }

  @Public()
  @Get('listings')
  @ApiOperation({ summary: 'Public trade-board listings.' })
  @ApiDataArray(MarketplaceListingResponseDto)
  listListings(@Query() query: MarketplaceListingQueryDto) {
    return this.marketplace.listListings(query);
  }

  @Public()
  @Get('listings/:id')
  @ApiOperation({ summary: 'One public listing.' })
  @ApiData(MarketplaceListingResponseDto)
  getListing(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketplace.getListing(id);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current business Marketplace profile and listings (seller manager).' })
  getProfile(@CurrentActor() actor: Actor) {
    return this.marketplace.getMyProfile(actor);
  }

  @Put('profile')
  @ApiBearerAuth()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.SALES)
  @ApiOperation({ summary: 'Publish or update the Marketplace profile.' })
  updateProfile(@CurrentActor() actor: Actor, @Body() dto: UpdateMarketplaceProfileDto) {
    return this.marketplace.updateProfile(actor, dto);
  }

  @Post('listings')
  @ApiBearerAuth()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.SALES)
  @ApiOperation({ summary: 'Create a Marketplace listing.' })
  @ApiData(MarketplaceListingResponseDto, 201)
  createListing(@CurrentActor() actor: Actor, @Body() dto: CreateMarketplaceListingDto) {
    return this.marketplace.createListing(actor, dto);
  }

  @Patch('listings/:id')
  @ApiBearerAuth()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.SALES)
  @ApiOperation({ summary: 'Update a Marketplace listing.' })
  @ApiData(MarketplaceListingResponseDto)
  updateListing(
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMarketplaceListingDto,
  ) {
    return this.marketplace.updateListing(actor, id, dto);
  }

  @Delete('listings/:id')
  @HttpCode(200)
  @ApiBearerAuth()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.SALES)
  @ApiOperation({ summary: 'Delete a Marketplace listing.' })
  deleteListing(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.marketplace.deleteListing(actor, id);
  }

  @Post('inquiries')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send an inquiry to a Marketplace seller.' })
  @ApiData(MarketplaceInquiryResponseDto, 201)
  createInquiry(@CurrentActor() actor: Actor, @Body() dto: CreateMarketplaceInquiryDto) {
    return this.marketplace.createInquiry(actor, dto);
  }

  @Get('inquiries')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inbox and sent Marketplace inquiries for the current business.' })
  @ApiDataArray(MarketplaceInquiryResponseDto)
  listInquiries(@CurrentActor() actor: Actor) {
    return this.marketplace.listInquiries(actor);
  }

  @Patch('inquiries/:id')
  @ApiBearerAuth()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.SALES)
  @ApiOperation({ summary: 'Update inquiry status (seller inbox).' })
  @ApiData(MarketplaceInquiryResponseDto)
  updateInquiry(
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMarketplaceInquiryDto,
  ) {
    return this.marketplace.updateInquiryStatus(actor, id, dto);
  }
}
