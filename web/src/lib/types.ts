export type Role = 'OWNER' | 'MANAGER' | 'ACCOUNTANT' | 'SUPERVISOR' | 'SALES' | 'STAFF' | 'WORKER';

export type Activity =
  | 'COLLECTOR'
  | 'PROCESSOR'
  | 'TRADER'
  | 'EXPORTER'
  | 'IMPORTER'
  | 'COLD_STORE'
  | 'BUYER';

export type PartnerRole =
  | 'SUPPLIER'
  | 'CUSTOMER'
  | 'BUYER'
  | 'PROCESSOR'
  | 'TRADER'
  | 'EXPORTER'
  | 'IMPORTER'
  | 'COLD_STORE'
  | 'OTHER';

export type LocationKind = 'PROCESSING' | 'BRANCH' | 'WAREHOUSE' | 'COLD_STORE';

export type Business = {
  id: string;
  name: string;
  legalName: string | null;
  slug: string;
  activities: Activity[];
  currency: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  description: string | null;
  active?: boolean;
  marketplaceEnabled?: boolean;
  marketplaceHeadline?: string | null;
  marketplaceBio?: string | null;
  marketplaceLanguages?: string[];
  updatedAt?: string;
};

export type MarketplaceBusiness = {
  id: string;
  name: string;
  slug: string;
  activities: Activity[];
  city: string | null;
  country: string;
  marketplaceHeadline: string | null;
  marketplaceBio: string | null;
  marketplaceLanguages: string[];
  listingCount: number;
  source?: 'MEMBER' | 'DIRECTORY';
  website?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type MarketplaceListing = {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  country: string;
  city: string | null;
  casingTypeId: string | null;
  qualityId: string | null;
  qualityText: string;
  quantity: string;
  unitLabel: string;
  currency: string;
  pricePerUnit: string | null;
  destinationHint: string | null;
  active: boolean;
  createdAt: string;
};

export type MarketplaceProfile = MarketplaceBusiness & {
  listings: MarketplaceListing[];
};

export type MarketplaceInquiry = {
  id: string;
  listingId: string | null;
  listingQualityText: string | null;
  toBusinessId: string;
  toBusinessName: string;
  fromUserId: string;
  fromUserName: string;
  fromBusinessId: string | null;
  fromBusinessName: string | null;
  message: string;
  contactEmail: string;
  status: 'OPEN' | 'REPLIED' | 'CLOSED';
  createdAt: string;
  direction: 'INBOX' | 'SENT';
};

export type SellerMarketplaceProfile = {
  marketplaceEnabled: boolean;
  marketplaceHeadline: string | null;
  marketplaceBio: string | null;
  marketplaceLanguages: string[];
  slug: string;
  name: string;
  country: string;
  city: string | null;
  currency: string;
  listings: MarketplaceListing[];
};

export type MembershipSummary = {
  businessId: string;
  businessName: string;
  role: Role;
};

export type SessionProfile = {
  user: { id: string; name: string; email: string };
  business: Business | null;
  role: Role | null;
  memberships: MembershipSummary[];
  isSuperAdmin: boolean;
  impersonating: boolean;
};

export type AuthSession = SessionProfile & {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  activities: Activity[];
  city: string | null;
  country: string;
  active: boolean;
  publicSiteEnabled?: boolean;
  publicSitePublished?: boolean;
  memberCount: number;
  createdAt: string;
  legalName?: string | null;
  phone?: string | null;
  email?: string | null;
  members?: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    role: Role;
    title: string | null;
    active: boolean;
  }>;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  createdAt: string;
  memberships: Array<{
    businessId: string;
    businessName: string;
    role: Role;
    active: boolean;
  }>;
};

export type BusinessDetail = Business & {
  counts: { locations: number; members: number; partners: number; qualities: number };
};

export type Location = {
  id: string;
  name: string;
  kind: LocationKind;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  active: boolean;
};

export type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  active: boolean;
};

export type Quality = {
  id: string;
  casingTypeId: string;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export type CasingType = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  qualities: Quality[];
};

export type Unit = {
  id: string;
  code: string;
  name: string;
  comparableGroup: string;
};

export type Partner = {
  id: string;
  name: string;
  roles: PartnerRole[];
  phone: string | null;
  email: string | null;
  country: string | null;
  address: string | null;
  currency: string | null;
  paymentTerms: string | null;
  notes: string | null;
  active: boolean;
};

export type PartnerPage = {
  items: Partner[];
  page: number;
  pageSize: number;
  total: number;
};
