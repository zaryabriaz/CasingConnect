import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { Actor } from './actor';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: MemberRole[]) => SetMetadata(ROLES_KEY, roles);

export const SUPER_ADMIN_KEY = 'superAdmin';
export const SuperAdmin = () => SetMetadata(SUPER_ADMIN_KEY, true);

export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => {
  return ctx.switchToHttp().getRequest<{ user: Actor }>().user;
});
