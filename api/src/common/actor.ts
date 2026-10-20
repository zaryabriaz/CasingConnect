import { ForbiddenException } from '@nestjs/common';
import { MemberRole } from '@prisma/client';

export type Actor = {
  userId: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  /** Null when a super admin is in platform mode (not inside a business). */
  businessId: string | null;
  /** Null in platform mode; OWNER-equivalent when a super admin impersonates. */
  role: MemberRole | null;
  impersonating: boolean;
};

export function requireBusinessId(actor: Actor): string {
  if (!actor.businessId) {
    throw new ForbiddenException('Open a business first.');
  }
  return actor.businessId;
}
