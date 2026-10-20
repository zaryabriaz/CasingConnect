import { Business, Location, Membership, User } from '@prisma/client';
import { BusinessResponseDto, LocationResponseDto, MemberResponseDto } from './dto';

export function toBusiness(business: Business): BusinessResponseDto {
  return {
    id: business.id,
    name: business.name,
    legalName: business.legalName,
    slug: business.slug,
    activities: business.activities,
    currency: business.currency,
    phone: business.phone,
    email: business.email,
    address: business.address,
    city: business.city,
    country: business.country,
    description: business.description,
    active: business.active,
    marketplaceEnabled: business.marketplaceEnabled,
    marketplaceHeadline: business.marketplaceHeadline,
    marketplaceBio: business.marketplaceBio,
    marketplaceLanguages: business.marketplaceLanguages,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };
}

export function toLocation(location: Location): LocationResponseDto {
  return {
    id: location.id,
    name: location.name,
    kind: location.kind,
    address: location.address,
    city: location.city,
    country: location.country,
    phone: location.phone,
    active: location.active,
  };
}

export function toMember(membership: Membership & { user: Pick<User, 'id' | 'name' | 'email'> }): MemberResponseDto {
  return {
    id: membership.id,
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    title: membership.title,
    active: membership.active,
  };
}
