import { Activity, LocationKind, PartnerRole, Role } from './types';

export const ACTIVITIES: [Activity, string][] = [
  ['COLLECTOR', 'Raw material collector'],
  ['PROCESSOR', 'Processor'],
  ['TRADER', 'Trader'],
  ['EXPORTER', 'Exporter'],
  ['IMPORTER', 'Importer'],
  ['COLD_STORE', 'Cold store'],
  ['BUYER', 'Buyer'],
];

/** Ops activities — buyers-only accounts have none of these. */
export const OPS_ACTIVITIES: Activity[] = [
  'COLLECTOR',
  'PROCESSOR',
  'TRADER',
  'EXPORTER',
  'IMPORTER',
  'COLD_STORE',
];

export function isBuyerOnly(activities: Activity[] | undefined | null) {
  if (!activities?.length) return false;
  return activities.every((activity) => activity === 'BUYER');
}

export const ROLES: [Role, string][] = [
  ['OWNER', 'Owner'],
  ['MANAGER', 'Manager'],
  ['ACCOUNTANT', 'Accountant'],
  ['SUPERVISOR', 'Supervisor'],
  ['SALES', 'Sales'],
  ['STAFF', 'Staff'],
  ['WORKER', 'Worker'],
];

export const LOCATION_KINDS: [LocationKind, string][] = [
  ['PROCESSING', 'Processing place'],
  ['BRANCH', 'Branch'],
  ['WAREHOUSE', 'Warehouse'],
  ['COLD_STORE', 'Cold store'],
];

export const PARTNER_ROLES: [PartnerRole, string][] = [
  ['SUPPLIER', 'Supplier'],
  ['CUSTOMER', 'Customer'],
  ['BUYER', 'Buyer'],
  ['PROCESSOR', 'Processor'],
  ['TRADER', 'Trader'],
  ['EXPORTER', 'Exporter'],
  ['IMPORTER', 'Importer'],
  ['OTHER', 'Other'],
];

export function labelOf(list: readonly (readonly [string, string])[], code: string) {
  return list.find((item) => item[0] === code)?.[1] ?? code;
}

export function canManage(role: Role) {
  return role === 'OWNER' || role === 'MANAGER';
}

export function canBook(role: Role) {
  return role === 'OWNER' || role === 'MANAGER' || role === 'ACCOUNTANT';
}
