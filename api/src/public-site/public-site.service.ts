import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { imageSize } from 'image-size';
import { join } from 'path';
import { Actor, requireBusinessId } from '../common/actor';
import { emptyToNull } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';
import {
  PublicCompanySiteDto,
  PublicSiteEditorDto,
  UpdatePublicSiteDto,
} from './dto';

const MANAGE_ROLES: MemberRole[] = [MemberRole.OWNER, MemberRole.MANAGER];
const DEFAULT_PRIMARY = '#0b342b';
const DEFAULT_ACCENT = '#b8923f';
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const MAX_COVER_BYTES = 6 * 1024 * 1024;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_GALLERY_BYTES = 6 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 12;
const COVER_MIN = { width: 1600, height: 900 };
const LOGO_MIN = { width: 128, height: 128 };
const LOGO_MAX = { width: 800, height: 800 };
const GALLERY_MIN = { width: 800, height: 600 };

type SiteBusiness = {
  publicSiteEnabled: boolean;
  publicSitePublished: boolean;
  publicSiteTagline: string | null;
  publicSiteHeadline: string | null;
  publicSiteAbout: string | null;
  publicSiteProducts: string | null;
  publicSiteMarkets: string | null;
  publicSitePrimaryColor: string;
  publicSiteAccentColor: string;
  publicSiteCoverUrl: string | null;
  publicSiteLogoUrl: string | null;
  publicSiteGallery: string[];
  slug: string;
  name: string;
  country: string;
  city: string | null;
  phone: string | null;
  email: string | null;
};

@Injectable()
export class PublicSiteService {
  constructor(private readonly prisma: PrismaService) {}

  private uploadsRoot() {
    return join(process.cwd(), 'uploads');
  }

  private assertSiteAccess(enabled: boolean) {
    if (!enabled) {
      throw new ForbiddenException(
        'Your public website access was turned off by CasingConnect admin.',
      );
    }
  }

  private readDimensions(buffer: Buffer) {
    try {
      const size = imageSize(buffer);
      if (!size.width || !size.height) {
        throw new BadRequestException('Could not read image dimensions.');
      }
      return { width: size.width, height: size.height };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Could not read image dimensions. Use a valid JPG, PNG, or WebP.');
    }
  }

  private assertMime(file: Express.Multer.File) {
    const extension = ALLOWED_MIME[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Use a JPG, PNG, or WebP image.');
    }
    return extension;
  }

  private async unlinkUpload(url: string | null | undefined) {
    if (!url?.startsWith('/uploads/public-sites/')) return;
    const previous = join(this.uploadsRoot(), url.replace(/^\/uploads\//, ''));
    await unlink(previous).catch(() => undefined);
  }

  private async saveUpload(
    businessId: string,
    subdir: string | null,
    prefix: string,
    file: Express.Multer.File,
    extension: string,
  ) {
    const relativeDir = subdir
      ? join('public-sites', businessId, subdir)
      : join('public-sites', businessId);
    const absoluteDir = join(this.uploadsRoot(), relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    const filename = `${prefix}-${Date.now()}${extension}`;
    await writeFile(join(absoluteDir, filename), file.buffer);
    return `/uploads/${relativeDir.replace(/\\/g, '/')}/${filename}`;
  }

  async getEditor(actor: Actor): Promise<PublicSiteEditorDto> {
    const businessId = requireBusinessId(actor);
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    return this.toEditor(business);
  }

  async updateEditor(actor: Actor, dto: UpdatePublicSiteDto): Promise<PublicSiteEditorDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    this.assertSiteAccess(existing.publicSiteEnabled);

    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: {
        publicSitePublished: dto.published === undefined ? undefined : dto.published,
        publicSiteTagline:
          dto.tagline === undefined ? undefined : emptyToNull(dto.tagline ?? undefined),
        publicSiteHeadline:
          dto.headline === undefined ? undefined : emptyToNull(dto.headline ?? undefined),
        publicSiteAbout:
          dto.about === undefined ? undefined : emptyToNull(dto.about ?? undefined),
        publicSiteProducts:
          dto.products === undefined ? undefined : emptyToNull(dto.products ?? undefined),
        publicSiteMarkets:
          dto.markets === undefined ? undefined : emptyToNull(dto.markets ?? undefined),
        publicSitePrimaryColor: dto.primaryColor?.toLowerCase(),
        publicSiteAccentColor: dto.accentColor?.toLowerCase(),
      },
    });
    return this.toEditor(business);
  }

  async uploadCover(
    actor: Actor,
    file: Express.Multer.File | undefined,
  ): Promise<PublicSiteEditorDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    this.assertSiteAccess(existing.publicSiteEnabled);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Choose a cover image to upload.');
    }
    if (file.size > MAX_COVER_BYTES) {
      throw new BadRequestException('Cover image must be 6 MB or smaller.');
    }
    const extension = this.assertMime(file);
    const { width, height } = this.readDimensions(file.buffer);
    if (width < COVER_MIN.width || height < COVER_MIN.height) {
      throw new BadRequestException(
        `Cover must be at least ${COVER_MIN.width}×${COVER_MIN.height} pixels (yours is ${width}×${height}).`,
      );
    }

    const coverUrl = await this.saveUpload(businessId, null, 'cover', file, extension);
    await this.unlinkUpload(existing.publicSiteCoverUrl);

    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: { publicSiteCoverUrl: coverUrl },
    });
    return this.toEditor(business);
  }

  async removeCover(actor: Actor): Promise<PublicSiteEditorDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    this.assertSiteAccess(existing.publicSiteEnabled);
    await this.unlinkUpload(existing.publicSiteCoverUrl);
    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: { publicSiteCoverUrl: null },
    });
    return this.toEditor(business);
  }

  async uploadLogo(
    actor: Actor,
    file: Express.Multer.File | undefined,
  ): Promise<PublicSiteEditorDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    this.assertSiteAccess(existing.publicSiteEnabled);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Choose a logo image to upload.');
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new BadRequestException('Logo must be 2 MB or smaller.');
    }
    const extension = this.assertMime(file);
    const { width, height } = this.readDimensions(file.buffer);
    if (width < LOGO_MIN.width || height < LOGO_MIN.height) {
      throw new BadRequestException(
        `Logo must be at least ${LOGO_MIN.width}×${LOGO_MIN.height} pixels (yours is ${width}×${height}).`,
      );
    }
    if (width > LOGO_MAX.width || height > LOGO_MAX.height) {
      throw new BadRequestException(
        `Logo must be at most ${LOGO_MAX.width}×${LOGO_MAX.height} pixels (yours is ${width}×${height}).`,
      );
    }

    const logoUrl = await this.saveUpload(businessId, 'logo', 'logo', file, extension);
    await this.unlinkUpload(existing.publicSiteLogoUrl);

    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: { publicSiteLogoUrl: logoUrl },
    });
    return this.toEditor(business);
  }

  async removeLogo(actor: Actor): Promise<PublicSiteEditorDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    this.assertSiteAccess(existing.publicSiteEnabled);
    await this.unlinkUpload(existing.publicSiteLogoUrl);
    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: { publicSiteLogoUrl: null },
    });
    return this.toEditor(business);
  }

  async uploadGalleryImage(
    actor: Actor,
    file: Express.Multer.File | undefined,
  ): Promise<PublicSiteEditorDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    this.assertSiteAccess(existing.publicSiteEnabled);
    if (existing.publicSiteGallery.length >= MAX_GALLERY_IMAGES) {
      throw new BadRequestException(`Gallery can have at most ${MAX_GALLERY_IMAGES} images.`);
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Choose a gallery image to upload.');
    }
    if (file.size > MAX_GALLERY_BYTES) {
      throw new BadRequestException('Gallery image must be 6 MB or smaller.');
    }
    const extension = this.assertMime(file);
    const { width, height } = this.readDimensions(file.buffer);
    if (width < GALLERY_MIN.width || height < GALLERY_MIN.height) {
      throw new BadRequestException(
        `Gallery images must be at least ${GALLERY_MIN.width}×${GALLERY_MIN.height} pixels (yours is ${width}×${height}).`,
      );
    }

    const imageUrl = await this.saveUpload(businessId, 'gallery', 'gallery', file, extension);
    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: { publicSiteGallery: { push: imageUrl } },
    });
    return this.toEditor(business);
  }

  async removeGalleryImage(actor: Actor, imageUrl: string): Promise<PublicSiteEditorDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    this.assertSiteAccess(existing.publicSiteEnabled);
    if (!existing.publicSiteGallery.includes(imageUrl)) {
      throw new BadRequestException('That gallery image was not found.');
    }
    await this.unlinkUpload(imageUrl);
    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: {
        publicSiteGallery: existing.publicSiteGallery.filter((url) => url !== imageUrl),
      },
    });
    return this.toEditor(business);
  }

  async listPublishedSites(): Promise<Array<{ slug: string; name: string; updatedAt: string }>> {
    const rows = await this.prisma.business.findMany({
      where: {
        active: true,
        publicSiteEnabled: true,
        publicSitePublished: true,
      },
      select: { slug: true, name: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    });
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async getPublicBySlug(slug: string): Promise<PublicCompanySiteDto> {
    const business = await this.prisma.business.findFirst({
      where: {
        slug,
        active: true,
        publicSiteEnabled: true,
        publicSitePublished: true,
      },
      include: {
        marketplaceListings: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    });
    if (!business) throw new NotFoundException('This company website is not available.');

    return {
      name: business.name,
      slug: business.slug,
      activities: business.activities,
      country: business.country,
      city: business.city,
      phone: business.phone,
      email: business.email,
      tagline: business.publicSiteTagline,
      headline: business.publicSiteHeadline,
      about: business.publicSiteAbout,
      products: business.publicSiteProducts,
      markets: business.publicSiteMarkets,
      primaryColor: business.publicSitePrimaryColor || DEFAULT_PRIMARY,
      accentColor: business.publicSiteAccentColor || DEFAULT_ACCENT,
      coverUrl: business.publicSiteCoverUrl,
      logoUrl: business.publicSiteLogoUrl,
      gallery: business.publicSiteGallery,
      listings: business.marketplaceListings.map((listing) => ({
        qualityText: listing.qualityText,
        quantity: listing.quantity.toString(),
        unitLabel: listing.unitLabel,
        currency: listing.currency,
        pricePerUnit: listing.pricePerUnit?.toString() ?? null,
        destinationHint: listing.destinationHint,
      })),
    };
  }

  private toEditor(business: SiteBusiness): PublicSiteEditorDto {
    return {
      enabled: business.publicSiteEnabled,
      published: business.publicSitePublished,
      tagline: business.publicSiteTagline,
      headline: business.publicSiteHeadline,
      about: business.publicSiteAbout,
      products: business.publicSiteProducts,
      markets: business.publicSiteMarkets,
      primaryColor: business.publicSitePrimaryColor || DEFAULT_PRIMARY,
      accentColor: business.publicSiteAccentColor || DEFAULT_ACCENT,
      coverUrl: business.publicSiteCoverUrl,
      logoUrl: business.publicSiteLogoUrl,
      gallery: business.publicSiteGallery ?? [],
      slug: business.slug,
      name: business.name,
      country: business.country,
      city: business.city,
      phone: business.phone,
      email: business.email,
      publicUrl: `/site/${business.slug}`,
    };
  }

  private assertCanManage(actor: Actor) {
    if (!actor.role || !MANAGE_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Only owners and managers can edit the public website.');
    }
  }
}
