import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MemberRole, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { provisionBusiness } from '../businesses/provision';
import { toBusiness } from '../businesses/mappers';
import { slugify } from '../common/slug';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthSessionDto, LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionDto> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account with this email already exists.');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const name = dto.name.trim();
    const businessName = dto.businessName.trim();
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash },
      });
      const business = await tx.business.create({
        data: {
          name: businessName,
          slug: await this.uniqueSlug(tx, dto.businessName),
          activities: dto.activities,
          currency: dto.currency?.trim().toUpperCase() || 'PKR',
          city: dto.city?.trim() || null,
          country: dto.country?.trim() || 'Pakistan',
          phone: dto.phone?.trim() || null,
        },
      });
      await tx.membership.create({
        data: { businessId: business.id, userId: user.id, role: 'OWNER' },
      });
      await provisionBusiness(tx, business.id);
      return { userId: user.id, businessId: business.id };
    });

    void this.mail.sendSignupWelcome({ to: email, name, businessName });

    return this.sessionFor(created.userId, created.businessId);
  }

  async login(dto: LoginDto): Promise<AuthSessionDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { where: { active: true }, include: { business: true } } },
    });
    const passwordMatches = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    if (user.isSuperAdmin) {
      return this.platformSessionFor(user.id);
    }

    const activeMemberships = user.memberships.filter((membership) => membership.business.active);
    if (activeMemberships.length === 0) {
      throw new UnauthorizedException('This account is not an active member of a business.');
    }
    const businessId =
      dto.businessId && activeMemberships.some((membership) => membership.businessId === dto.businessId)
        ? dto.businessId
        : activeMemberships[0].businessId;
    return this.sessionFor(user.id, businessId);
  }

  async switchBusiness(userId: string, businessId: string): Promise<AuthSessionDto> {
    const membership = await this.prisma.membership.findUnique({
      where: { businessId_userId: { businessId, userId } },
      include: { business: true },
    });
    if (!membership?.active || !membership.business.active) {
      throw new ForbiddenException('You are not an active member of that business.');
    }
    return this.sessionFor(userId, businessId);
  }

  async me(userId: string, businessId: string | null, opts: { isSuperAdmin: boolean; impersonating: boolean }) {
    if (opts.isSuperAdmin && (!businessId || !opts.impersonating)) {
      return this.platformSessionFor(userId).then((session) => ({
        user: session.user,
        business: session.business,
        role: session.role,
        memberships: session.memberships,
        isSuperAdmin: session.isSuperAdmin,
        impersonating: session.impersonating,
      }));
    }
    if (!businessId) {
      throw new UnauthorizedException('Sign in required.');
    }
    const session = await this.sessionFor(userId, businessId, {
      isSuperAdmin: opts.isSuperAdmin,
      impersonating: opts.impersonating,
    });
    return {
      user: session.user,
      business: session.business,
      role: session.role,
      memberships: session.memberships,
      isSuperAdmin: session.isSuperAdmin,
      impersonating: session.impersonating,
    };
  }

  async platformSessionFor(userId: string): Promise<AuthSessionDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Super admin access required.');
    }
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, superAdmin: true }),
      tokenType: 'Bearer',
      expiresIn: Number(this.config.get('JWT_EXPIRES_SECONDS') ?? 60 * 60 * 24 * 30),
      user: { id: user.id, name: user.name, email: user.email },
      business: null,
      role: null,
      memberships: [],
      isSuperAdmin: true,
      impersonating: false,
    };
  }

  async impersonateSession(userId: string, businessId: string): Promise<AuthSessionDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Super admin access required.');
    }
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new ForbiddenException('Business not found.');
    }
    if (!business.active) {
      throw new ForbiddenException('This business is suspended.');
    }
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        superAdmin: true,
        businessId: business.id,
        impersonating: true,
      }),
      tokenType: 'Bearer',
      expiresIn: Number(this.config.get('JWT_EXPIRES_SECONDS') ?? 60 * 60 * 24 * 30),
      user: { id: user.id, name: user.name, email: user.email },
      business: toBusiness(business),
      role: MemberRole.OWNER,
      memberships: [],
      isSuperAdmin: true,
      impersonating: true,
    };
  }

  private async sessionFor(
    userId: string,
    businessId: string,
    opts?: { isSuperAdmin?: boolean; impersonating?: boolean },
  ): Promise<AuthSessionDto> {
    if (opts?.isSuperAdmin && opts.impersonating) {
      return this.impersonateSession(userId, businessId);
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: {
          where: { active: true },
          include: { business: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const current = user.memberships.find(
      (membership) => membership.businessId === businessId && membership.business.active,
    );
    if (!current) throw new UnauthorizedException('This business access is no longer active.');

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, businessId }),
      tokenType: 'Bearer',
      expiresIn: Number(this.config.get('JWT_EXPIRES_SECONDS') ?? 60 * 60 * 24 * 30),
      user: { id: user.id, name: user.name, email: user.email },
      business: toBusiness(current.business),
      role: current.role,
      memberships: user.memberships
        .filter((membership) => membership.business.active)
        .map((membership) => ({
          businessId: membership.businessId,
          businessName: membership.business.name,
          role: membership.role,
        })),
      isSuperAdmin: user.isSuperAdmin,
      impersonating: false,
    };
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, name: string) {
    const base = slugify(name);
    let slug = base;
    let suffix = 2;
    while (await tx.business.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }
}
