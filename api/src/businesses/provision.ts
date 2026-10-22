import { Prisma } from '@prisma/client';
import {
  CASING_TYPE_PRESETS,
  DEFAULT_MATERIAL_CATEGORIES,
  DEFAULT_UNITS,
  qualitiesForPreset,
} from '../industry/defaults';

export async function provisionBusiness(tx: Prisma.TransactionClient, businessId: string) {
  for (const preset of CASING_TYPE_PRESETS) {
    const casingType = await tx.casingType.create({
      data: {
        businessId,
        code: preset.code,
        name: preset.name,
        active: preset.activeByDefault,
      },
    });
    const qualities = qualitiesForPreset(preset);
    if (qualities.length) {
      await tx.quality.createMany({
        data: qualities.map((name, index) => ({
          businessId,
          casingTypeId: casingType.id,
          code: name,
          name,
          sortOrder: index + 1,
          active: true,
        })),
      });
    }
  }

  await tx.unit.createMany({
    data: DEFAULT_UNITS.map((unit) => ({ businessId, ...unit })),
  });

  await tx.materialCategory.createMany({
    data: DEFAULT_MATERIAL_CATEGORIES.map((row) => ({ businessId, ...row })),
  });
}
