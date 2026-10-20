import { PrismaClient } from '@prisma/client';
import { CASING_TYPE_PRESETS, qualitiesForPreset } from './defaults';

type QualityDb = Pick<PrismaClient, 'casingType' | 'quality'>;

/**
 * For every built-in casing type on this business, ensure diameter+grade qualities exist.
 * Works for sheep, beef, and any future preset — not only sheep.
 * Custom casing types (no preset) are left alone; the business adds their own qualities.
 */
export async function syncCasingQualities(db: QualityDb, businessId: string) {
  const types = await db.casingType.findMany({ where: { businessId } });

  for (const type of types) {
    const preset = CASING_TYPE_PRESETS.find((item) => item.code === type.code);
    if (!preset) continue;

    const wanted = qualitiesForPreset(preset);
    const existing = await db.quality.findMany({ where: { casingTypeId: type.id } });
    const names = new Set(existing.map((quality) => quality.name));
    const missing = wanted.filter((name) => !names.has(name));

    if (missing.length > 0) {
      await db.quality.createMany({
        data: missing.map((name) => ({
          businessId,
          casingTypeId: type.id,
          code: name,
          name,
          sortOrder: 0,
          active: true,
        })),
      });
    }

    for (const [index, name] of wanted.entries()) {
      await db.quality.updateMany({
        where: { casingTypeId: type.id, name },
        data: { sortOrder: index + 1, active: true },
      });
    }

    // Diameter alone is not a quality — only diameter + grade.
    if (preset.diameters.length) {
      await db.quality.updateMany({
        where: { casingTypeId: type.id, name: { in: [...preset.diameters, 'AB'] } },
        data: { active: false },
      });
    }
  }
}

/** @deprecated use syncCasingQualities */
export const syncSheepQualities = syncCasingQualities;
