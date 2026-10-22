import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessActivity, MarketplaceProspectStatus, MemberRole, Prisma } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { emptyToNull } from '../common/text';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
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

const MANAGE_ROLES: MemberRole[] = [MemberRole.OWNER, MemberRole.MANAGER, MemberRole.SALES];
const DIRECTORY_SLUG_PREFIX = 'dir-';
const SELF_SUBMIT_SOURCE = 'https://casingconnect.com/marketplace/list-company';
const SELF_SUBMIT_LABEL = 'Self-submitted';

function trimHeadline(text: string | null | undefined, max = 140) {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async createListingRequest(
    dto: CreateMarketplaceListingRequestDto,
  ): Promise<MarketplaceListingRequestResponseDto> {
    const companyName = dto.companyName.trim();
    const contactName = dto.contactName.trim();
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone?.trim() || null;
    const country = dto.country.trim();
    const city = dto.city?.trim() || null;
    const about = dto.about.trim();
    let companyWebsite = dto.companyWebsite?.trim() || null;
    if (companyWebsite && !/^https?:\/\//i.test(companyWebsite)) {
      companyWebsite = `https://${companyWebsite}`;
    }

    const snippet = [
      about,
      contactName ? `Contact: ${contactName}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const row = await this.prisma.marketplaceProspect.upsert({
      where: {
        name_sourceUrl: {
          name: companyName,
          sourceUrl: SELF_SUBMIT_SOURCE,
        },
      },
      create: {
        name: companyName,
        country,
        city,
        website: companyWebsite,
        email,
        phone,
        sourceUrl: SELF_SUBMIT_SOURCE,
        sourceLabel: SELF_SUBMIT_LABEL,
        snippet,
        status: MarketplaceProspectStatus.NEW,
        notes: `Submitted by ${contactName} via marketplace form.`,
      },
      update: {
        country,
        city,
        website: companyWebsite,
        email,
        phone,
        snippet,
        status: MarketplaceProspectStatus.NEW,
        notes: `Updated by ${contactName} via marketplace form.`,
        sourceLabel: SELF_SUBMIT_LABEL,
      },
    });

    void this.mail.notifyMarketplaceListingRequest({
      id: row.id,
      companyName,
      contactName,
      email,
      phone,
      country,
      city,
      companyWebsite,
      about,
    });
    void this.mail.sendEnquiryAutoReply({
      to: email,
      name: contactName,
      kind: 'marketplace_listing',
      detailLine: `Company submitted: ${companyName}`,
    });

    return {
      id: row.id,
      companyName: row.name,
      message:
        'Thanks — your company is now listed in the Marketplace directory. Our team may follow up to verify details.',
    };
  }

  async listBusinesses(query: MarketplaceBusinessQueryDto): Promise<PublicMarketplaceBusinessDto[]> {
    const country = query.country?.trim() || undefined;
    const q = query.q?.trim() || undefined;

    const where: Prisma.BusinessWhereInput = {
      active: true,
      marketplaceEnabled: true,
      country,
      activities: query.activity ? { has: query.activity } : undefined,
      OR: q
        ? [
            { name: { contains: q, mode: 'insensitive' } },
            { marketplaceHeadline: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const businesses = await this.prisma.business.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 200,
      include: {
        _count: { select: { marketplaceListings: { where: { active: true } } } },
      },
    });

    const members: PublicMarketplaceBusinessDto[] = businesses.map((business) => ({
      id: business.id,
      name: business.name,
      slug: business.slug,
      activities: business.activities,
      city: business.city,
      country: business.country,
      marketplaceHeadline: trimHeadline(business.marketplaceHeadline),
      // Directory cards only need a short headline — full bio loads on the profile page.
      marketplaceBio: null,
      marketplaceLanguages: [],
      listingCount: business._count.marketplaceListings,
      source: 'MEMBER' as const,
      website: null,
      email: null,
      phone: null,
    }));

    // Industry prospects (admin-loaded) appear in the public directory too.
    // Activity filter is member-only — prospects have no activities array.
    const prospects =
      query.activity
        ? []
        : await this.prisma.marketplaceProspect.findMany({
            where: {
              status: { in: [MarketplaceProspectStatus.NEW, MarketplaceProspectStatus.REVIEWED] },
              country: country || undefined,
              OR: q
                ? [
                    { name: { contains: q, mode: 'insensitive' } },
                    { city: { contains: q, mode: 'insensitive' } },
                    { snippet: { contains: q, mode: 'insensitive' } },
                  ]
                : undefined,
            },
            orderBy: { name: 'asc' },
            take: 500,
          });

    const directory: PublicMarketplaceBusinessDto[] = prospects.map((row) => ({
      id: row.id,
      name: row.name,
      slug: `${DIRECTORY_SLUG_PREFIX}${row.id}`,
      activities: [BusinessActivity.EXPORTER, BusinessActivity.TRADER],
      city: row.city,
      country: row.country?.trim() || 'Unknown',
      marketplaceHeadline: trimHeadline(row.snippet),
      marketplaceBio: null,
      marketplaceLanguages: [],
      listingCount: 0,
      source: 'DIRECTORY' as const,
      website: null,
      email: null,
      phone: null,
    }));

    return [...members, ...directory].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getBusinessBySlug(slug: string): Promise<PublicMarketplaceProfileDto> {
    if (slug.startsWith(DIRECTORY_SLUG_PREFIX)) {
      const id = slug.slice(DIRECTORY_SLUG_PREFIX.length);
      const row = await this.prisma.marketplaceProspect.findFirst({
        where: {
          id,
          status: { in: [MarketplaceProspectStatus.NEW, MarketplaceProspectStatus.REVIEWED] },
        },
      });
      if (!row) throw new NotFoundException('Company not found on the Marketplace.');
      return {
        id: row.id,
        name: row.name,
        slug: `${DIRECTORY_SLUG_PREFIX}${row.id}`,
        activities: [BusinessActivity.EXPORTER, BusinessActivity.TRADER],
        city: row.city,
        country: row.country?.trim() || 'Unknown',
        marketplaceHeadline: row.snippet,
        marketplaceBio: row.snippet,
        marketplaceLanguages: [],
        listingCount: 0,
        source: 'DIRECTORY',
        website: row.website,
        email: row.email,
        phone: row.phone,
        listings: [],
      };
    }

    const business = await this.prisma.business.findFirst({
      where: { slug, active: true, marketplaceEnabled: true },
      include: {
        marketplaceListings: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
          include: { business: { select: { id: true, name: true, slug: true, city: true, country: true } } },
        },
        _count: { select: { marketplaceListings: { where: { active: true } } } },
      },
    });
    if (!business) throw new NotFoundException('Company not found on the Marketplace.');

    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      activities: business.activities,
      city: business.city,
      country: business.country,
      marketplaceHeadline: business.marketplaceHeadline,
      marketplaceBio: business.marketplaceBio,
      marketplaceLanguages: business.marketplaceLanguages,
      listingCount: business._count.marketplaceListings,
      source: 'MEMBER',
      website: null,
      email: business.email,
      phone: business.phone,
      listings: business.marketplaceListings.map((listing) => this.toListing(listing)),
    };
  }

  async listListings(query: MarketplaceListingQueryDto): Promise<MarketplaceListingResponseDto[]> {
    const where: Prisma.MarketplaceListingWhereInput = {
      active: true,
      business: {
        active: true,
        marketplaceEnabled: true,
        country: query.country?.trim() || undefined,
      },
      currency: query.currency?.trim().toUpperCase() || undefined,
      qualityText: query.quality?.trim()
        ? { contains: query.quality.trim(), mode: 'insensitive' }
        : undefined,
      OR: query.q?.trim()
        ? [
            { qualityText: { contains: query.q.trim(), mode: 'insensitive' } },
            { destinationHint: { contains: query.q.trim(), mode: 'insensitive' } },
            { business: { name: { contains: query.q.trim(), mode: 'insensitive' } } },
          ]
        : undefined,
    };

    const listings = await this.prisma.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { business: { select: { id: true, name: true, slug: true, city: true, country: true } } },
    });

    return listings.map((listing) => this.toListing(listing));
  }

  async getListing(id: string): Promise<MarketplaceListingResponseDto> {
    const listing = await this.prisma.marketplaceListing.findFirst({
      where: {
        id,
        active: true,
        business: { active: true, marketplaceEnabled: true },
      },
      include: { business: { select: { id: true, name: true, slug: true, city: true, country: true } } },
    });
    if (!listing) throw new NotFoundException('Listing not found.');
    return this.toListing(listing);
  }

  async updateProfile(actor: Actor, dto: UpdateMarketplaceProfileDto) {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: {
        marketplaceEnabled: dto.marketplaceEnabled,
        marketplaceHeadline:
          dto.marketplaceHeadline === undefined
            ? undefined
            : emptyToNull(dto.marketplaceHeadline ?? undefined),
        marketplaceBio:
          dto.marketplaceBio === undefined ? undefined : emptyToNull(dto.marketplaceBio ?? undefined),
        marketplaceLanguages: dto.marketplaceLanguages?.map((lang) => lang.trim()).filter(Boolean),
      },
    });
    return {
      marketplaceEnabled: business.marketplaceEnabled,
      marketplaceHeadline: business.marketplaceHeadline,
      marketplaceBio: business.marketplaceBio,
      marketplaceLanguages: business.marketplaceLanguages,
      slug: business.slug,
      name: business.name,
      country: business.country,
      city: business.city,
      currency: business.currency,
    };
  }

  async getMyProfile(actor: Actor) {
    const businessId = requireBusinessId(actor);
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      include: {
        marketplaceListings: {
          orderBy: { createdAt: 'desc' },
          include: { business: { select: { id: true, name: true, slug: true, city: true, country: true } } },
        },
      },
    });
    return {
      marketplaceEnabled: business.marketplaceEnabled,
      marketplaceHeadline: business.marketplaceHeadline,
      marketplaceBio: business.marketplaceBio,
      marketplaceLanguages: business.marketplaceLanguages,
      slug: business.slug,
      name: business.name,
      country: business.country,
      city: business.city,
      currency: business.currency,
      listings: business.marketplaceListings.map((listing) => this.toListing(listing)),
    };
  }

  async createListing(actor: Actor, dto: CreateMarketplaceListingDto): Promise<MarketplaceListingResponseDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    await this.assertCatalogRefs(businessId, dto.casingTypeId, dto.qualityId);

    const listing = await this.prisma.marketplaceListing.create({
      data: {
        businessId,
        casingTypeId: dto.casingTypeId ?? null,
        qualityId: dto.qualityId ?? null,
        qualityText: dto.qualityText.trim(),
        quantity: new Prisma.Decimal(dto.quantity),
        unitLabel: dto.unitLabel.trim(),
        currency: dto.currency.trim().toUpperCase(),
        pricePerUnit: dto.pricePerUnit ? new Prisma.Decimal(dto.pricePerUnit) : null,
        destinationHint: emptyToNull(dto.destinationHint),
      },
      include: { business: { select: { id: true, name: true, slug: true, city: true, country: true } } },
    });
    return this.toListing(listing);
  }

  async updateListing(
    actor: Actor,
    id: string,
    dto: UpdateMarketplaceListingDto,
  ): Promise<MarketplaceListingResponseDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.marketplaceListing.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException('Listing not found.');

    const casingTypeId = dto.casingTypeId === undefined ? existing.casingTypeId : dto.casingTypeId;
    const qualityId = dto.qualityId === undefined ? existing.qualityId : dto.qualityId;
    await this.assertCatalogRefs(businessId, casingTypeId ?? undefined, qualityId ?? undefined);

    const listing = await this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        casingTypeId: dto.casingTypeId === undefined ? undefined : dto.casingTypeId,
        qualityId: dto.qualityId === undefined ? undefined : dto.qualityId,
        qualityText: dto.qualityText?.trim(),
        quantity: dto.quantity ? new Prisma.Decimal(dto.quantity) : undefined,
        unitLabel: dto.unitLabel?.trim(),
        currency: dto.currency?.trim().toUpperCase(),
        pricePerUnit:
          dto.pricePerUnit === undefined
            ? undefined
            : dto.pricePerUnit === null || dto.pricePerUnit === ''
              ? null
              : new Prisma.Decimal(dto.pricePerUnit),
        destinationHint:
          dto.destinationHint === undefined
            ? undefined
            : emptyToNull(dto.destinationHint ?? undefined),
        active: dto.active,
      },
      include: { business: { select: { id: true, name: true, slug: true, city: true, country: true } } },
    });
    return this.toListing(listing);
  }

  async deleteListing(actor: Actor, id: string) {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.marketplaceListing.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException('Listing not found.');
    await this.prisma.marketplaceListing.delete({ where: { id } });
    return { ok: true };
  }

  async createInquiry(actor: Actor, dto: CreateMarketplaceInquiryDto): Promise<MarketplaceInquiryResponseDto> {
    let toBusinessId = dto.toBusinessId;
    let listingId = dto.listingId ?? null;

    if (listingId) {
      const listing = await this.prisma.marketplaceListing.findFirst({
        where: {
          id: listingId,
          active: true,
          business: { active: true, marketplaceEnabled: true },
        },
      });
      if (!listing) throw new NotFoundException('Listing not found.');
      toBusinessId = listing.businessId;
    }

    if (!toBusinessId) {
      throw new BadRequestException('Choose a listing or company to inquire about.');
    }

    const toBusiness = await this.prisma.business.findFirst({
      where: { id: toBusinessId, active: true, marketplaceEnabled: true },
    });
    if (!toBusiness) throw new NotFoundException('Company not found on the Marketplace.');

    if (actor.businessId && actor.businessId === toBusinessId) {
      throw new BadRequestException('You cannot inquire with your own company.');
    }

    const contactEmail = (dto.contactEmail?.trim() || actor.email).toLowerCase();
    const inquiry = await this.prisma.marketplaceInquiry.create({
      data: {
        listingId,
        toBusinessId,
        fromUserId: actor.userId,
        fromBusinessId: actor.businessId,
        message: dto.message.trim(),
        contactEmail,
      },
      include: {
        toBusiness: { select: { id: true, name: true } },
        fromUser: { select: { id: true, name: true } },
        fromBusiness: { select: { id: true, name: true } },
        listing: { select: { id: true, qualityText: true } },
      },
    });

    void this.mail.sendEnquiryAutoReply({
      to: contactEmail,
      name: inquiry.fromUser.name,
      kind: 'marketplace_inquiry',
      detailLine: `Enquiry sent to: ${inquiry.toBusiness.name}`,
    });

    return this.toInquiry(inquiry, 'SENT');
  }

  async listInquiries(actor: Actor): Promise<MarketplaceInquiryResponseDto[]> {
    const businessId = requireBusinessId(actor);
    const rows = await this.prisma.marketplaceInquiry.findMany({
      where: {
        OR: [{ toBusinessId: businessId }, { fromBusinessId: businessId }, { fromUserId: actor.userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        toBusiness: { select: { id: true, name: true } },
        fromUser: { select: { id: true, name: true } },
        fromBusiness: { select: { id: true, name: true } },
        listing: { select: { id: true, qualityText: true } },
      },
    });

    return rows.map((row) =>
      this.toInquiry(row, row.toBusinessId === businessId ? 'INBOX' : 'SENT'),
    );
  }

  async updateInquiryStatus(
    actor: Actor,
    id: string,
    dto: UpdateMarketplaceInquiryDto,
  ): Promise<MarketplaceInquiryResponseDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.marketplaceInquiry.findFirst({
      where: { id, toBusinessId: businessId },
    });
    if (!existing) throw new NotFoundException('Inquiry not found.');

    const inquiry = await this.prisma.marketplaceInquiry.update({
      where: { id },
      data: { status: dto.status },
      include: {
        toBusiness: { select: { id: true, name: true } },
        fromUser: { select: { id: true, name: true } },
        fromBusiness: { select: { id: true, name: true } },
        listing: { select: { id: true, qualityText: true } },
      },
    });
    return this.toInquiry(inquiry, 'INBOX');
  }

  private assertCanManage(actor: Actor) {
    if (actor.isSuperAdmin && actor.impersonating) return;
    if (!actor.role || !MANAGE_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Your role cannot manage Marketplace listings.');
    }
  }

  private async assertCatalogRefs(
    businessId: string,
    casingTypeId?: string | null,
    qualityId?: string | null,
  ) {
    if (casingTypeId) {
      const casingType = await this.prisma.casingType.findFirst({ where: { id: casingTypeId, businessId } });
      if (!casingType) throw new BadRequestException('Casing type not found in this business.');
    }
    if (qualityId) {
      const quality = await this.prisma.quality.findFirst({ where: { id: qualityId, businessId } });
      if (!quality) throw new BadRequestException('Quality not found in this business.');
      if (casingTypeId && quality.casingTypeId !== casingTypeId) {
        throw new BadRequestException('Quality does not belong to the selected casing type.');
      }
    }
  }

  private toListing(listing: {
    id: string;
    businessId: string;
    casingTypeId: string | null;
    qualityId: string | null;
    qualityText: string;
    quantity: Prisma.Decimal;
    unitLabel: string;
    currency: string;
    pricePerUnit: Prisma.Decimal | null;
    destinationHint: string | null;
    active: boolean;
    createdAt: Date;
    business: { id: string; name: string; slug: string; city: string | null; country: string };
  }): MarketplaceListingResponseDto {
    return {
      id: listing.id,
      businessId: listing.businessId,
      businessName: listing.business.name,
      businessSlug: listing.business.slug,
      country: listing.business.country,
      city: listing.business.city,
      casingTypeId: listing.casingTypeId,
      qualityId: listing.qualityId,
      qualityText: listing.qualityText,
      quantity: listing.quantity.toString(),
      unitLabel: listing.unitLabel,
      currency: listing.currency,
      pricePerUnit: listing.pricePerUnit?.toString() ?? null,
      destinationHint: listing.destinationHint,
      active: listing.active,
      createdAt: listing.createdAt.toISOString(),
    };
  }

  private toInquiry(
    inquiry: {
      id: string;
      listingId: string | null;
      toBusinessId: string;
      fromUserId: string;
      fromBusinessId: string | null;
      message: string;
      contactEmail: string;
      status: MarketplaceInquiryResponseDto['status'];
      createdAt: Date;
      toBusiness: { id: string; name: string };
      fromUser: { id: string; name: string };
      fromBusiness: { id: string; name: string } | null;
      listing: { id: string; qualityText: string } | null;
    },
    direction: 'INBOX' | 'SENT',
  ): MarketplaceInquiryResponseDto {
    return {
      id: inquiry.id,
      listingId: inquiry.listingId,
      listingQualityText: inquiry.listing?.qualityText ?? null,
      toBusinessId: inquiry.toBusinessId,
      toBusinessName: inquiry.toBusiness.name,
      fromUserId: inquiry.fromUserId,
      fromUserName: inquiry.fromUser.name,
      fromBusinessId: inquiry.fromBusinessId,
      fromBusinessName: inquiry.fromBusiness?.name ?? null,
      message: inquiry.message,
      contactEmail: inquiry.contactEmail,
      status: inquiry.status,
      createdAt: inquiry.createdAt.toISOString(),
      direction,
    };
  }
}
