import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { MemberRole } from '@prisma/client';
import { Actor } from './actor';
import { IS_PUBLIC_KEY, ROLES_KEY, SUPER_ADMIN_KEY } from './decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = Actor>(error: unknown, user: TUser): TUser {
    if (error || !user) {
      throw error instanceof UnauthorizedException
        ? error
        : new UnauthorizedException('Sign in required.');
    }
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiresSuperAdmin = this.reflector.getAllAndOverride<boolean>(SUPER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const actor = context.switchToHttp().getRequest<{ user?: Actor }>().user;

    if (requiresSuperAdmin) {
      if (!actor?.isSuperAdmin) {
        throw new ForbiddenException('Super admin access required.');
      }
      return true;
    }

    const roles = this.reflector.getAllAndOverride<MemberRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    if (!actor) {
      throw new ForbiddenException('Your role can view this area, but cannot change it.');
    }
    // Super admin inside a business has Owner-equivalent access.
    if (actor.isSuperAdmin && actor.businessId && actor.impersonating) {
      return true;
    }
    if (!actor.role || !roles.includes(actor.role)) {
      throw new ForbiddenException('Your role can view this area, but cannot change it.');
    }
    return true;
  }
}
