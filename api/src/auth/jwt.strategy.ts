import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Actor } from '../common/actor';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = { sub?: string; businessId?: string; superAdmin?: boolean; impersonating?: boolean };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<Actor> {
    if (!payload.sub) {
      throw new UnauthorizedException('Sign in required.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Sign in required.');
    }

    if (payload.superAdmin) {
      if (!user.isSuperAdmin) {
        throw new UnauthorizedException('Super admin access is no longer available.');
      }

      if (payload.businessId) {
        const business = await this.prisma.business.findUnique({ where: { id: payload.businessId } });
        if (!business?.active) {
          throw new UnauthorizedException('This business is not available.');
        }
        return {
          userId: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: true,
          businessId: business.id,
          role: 'OWNER',
          impersonating: true,
        };
      }

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: true,
        businessId: null,
        role: null,
        impersonating: false,
      };
    }

    if (!payload.businessId) {
      throw new UnauthorizedException('Sign in required.');
    }

    const membership = await this.prisma.membership.findUnique({
      where: { businessId_userId: { businessId: payload.businessId, userId: payload.sub } },
      include: { user: true, business: true },
    });
    if (!membership?.active || !membership.business.active) {
      throw new UnauthorizedException('This business access is no longer active.');
    }

    return {
      userId: membership.userId,
      email: membership.user.email,
      name: membership.user.name,
      isSuperAdmin: membership.user.isSuperAdmin,
      businessId: membership.businessId,
      role: membership.role,
      impersonating: false,
    };
  }
}
