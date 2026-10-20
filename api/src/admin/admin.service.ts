import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAdminBusinessDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async listBusinesses() {
    const businesses = await this.prisma.business.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { memberships: true } } },
    });
    return businesses.map((business) => ({
      id: business.id,
      name: business.name,
      slug: business.slug,
      activities: business.activities,
      city: business.city,
      country: business.country,
      active: business.active,
      publicSiteEnabled: business.publicSiteEnabled,
      publicSitePublished: business.publicSitePublished,
      memberCount: business._count.memberships,
      createdAt: business.createdAt.toISOString(),
    }));
  }

  async getBusiness(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!business) throw new NotFoundException('Business not found.');
    return {
      id: business.id,
      name: business.name,
      legalName: business.legalName,
      slug: business.slug,
      activities: business.activities,
      city: business.city,
      country: business.country,
      phone: business.phone,
      email: business.email,
      active: business.active,
      memberCount: business.memberships.length,
      createdAt: business.createdAt.toISOString(),
      members: business.memberships.map((membership) => ({
        id: membership.id,
        userId: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        title: membership.title,
        active: membership.active,
      })),
    };
  }

  async updateBusiness(id: string, dto: UpdateAdminBusinessDto) {
    const existing = await this.prisma.business.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Business not found.');

    const disablingSite =
      dto.publicSiteEnabled !== undefined && dto.publicSiteEnabled === false;

    const business = await this.prisma.business.update({
      where: { id },
      data: {
        ...(dto.active === undefined ? {} : { active: dto.active }),
        ...(dto.publicSiteEnabled === undefined
          ? {}
          : { publicSiteEnabled: dto.publicSiteEnabled }),
        // Turning off Activate website also takes the public site offline.
        ...(disablingSite ? { publicSitePublished: false } : {}),
      },
      include: { _count: { select: { memberships: true } } },
    });
    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      activities: business.activities,
      city: business.city,
      country: business.country,
      active: business.active,
      publicSiteEnabled: business.publicSiteEnabled,
      publicSitePublished: business.publicSitePublished,
      memberCount: business._count.memberships,
      createdAt: business.createdAt.toISOString(),
    };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          include: { business: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt.toISOString(),
      memberships: user.memberships.map((membership) => ({
        businessId: membership.business.id,
        businessName: membership.business.name,
        role: membership.role,
        active: membership.active,
      })),
    }));
  }

  impersonate(userId: string, businessId: string) {
    return this.auth.impersonateSession(userId, businessId);
  }

  exitImpersonation(userId: string) {
    return this.auth.platformSessionFor(userId);
  }
}
