import { IncomingMaterial } from '@prisma/client';
import { DEFAULT_MATERIAL_CATEGORIES } from '../industry/defaults';

export { DEFAULT_MATERIAL_CATEGORIES };

/** Map a material category code to the legacy IncomingMaterial used by stock/production math. */
export function incomingFormFromCategoryCode(code: string): IncomingMaterial {
  const upper = code.trim().toUpperCase();
  if (upper === 'EIGHTEEN_UP') return IncomingMaterial.EIGHTEEN_UP;
  if (upper === 'QUALITY') return IncomingMaterial.QUALITY;
  return IncomingMaterial.RODA;
}

export function slugMaterialCategoryCode(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return base || 'CUSTOM';
}

export function presentMaterialCategory(row: {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
  requiresQuality: boolean;
  system: boolean;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sortOrder: row.sortOrder,
    active: row.active,
    requiresQuality: row.requiresQuality,
    system: row.system,
  };
}

export type MaterialCategorySeed = (typeof DEFAULT_MATERIAL_CATEGORIES)[number];
