/** Grades shared across casing types: diameter + grade makes one quality (e.g. 16/18 AB). */
export const QUALITY_GRADES = ['AB', 'A', 'C'] as const;

export type CasingTypePreset = {
  code: string;
  name: string;
  activeByDefault: boolean;
  /** Calibre / diameter bands for this animal type. */
  diameters: readonly string[];
  grades: readonly string[];
};

/**
 * Built-in casing categories. New businesses get these types.
 * Custom types can still be added later; they keep their own qualities.
 */
export const CASING_TYPE_PRESETS: readonly CasingTypePreset[] = [
  {
    code: 'SHEEP',
    name: 'Sheep casing',
    activeByDefault: true,
    diameters: ['16/18', '18/20', '20/22', '22/24', '24/26'],
    grades: QUALITY_GRADES,
  },
  {
    code: 'BEEF',
    name: 'Beef casing',
    activeByDefault: false,
    diameters: ['26/28', '28/30', '30/32', '32/35', '35/38', '38/42', '40/43', '43/+'],
    grades: QUALITY_GRADES,
  },
] as const;

export function qualitiesForPreset(preset: CasingTypePreset): string[] {
  return preset.diameters.flatMap((diameter) => preset.grades.map((grade) => `${diameter} ${grade}`));
}

export function presetByCode(code: string): CasingTypePreset | undefined {
  return CASING_TYPE_PRESETS.find((preset) => preset.code === code.toUpperCase());
}

/** @deprecated use qualitiesForPreset(presetByCode('SHEEP')) — kept for older imports */
export const SHEEP_QUALITIES = qualitiesForPreset(CASING_TYPE_PRESETS[0]!);

export const DEFAULT_UNITS = [
  { code: 'NUMBER', name: 'Number', comparableGroup: 'number' },
  { code: 'RODA', name: 'Roda', comparableGroup: 'roda' },
  { code: 'HANKS', name: 'Hanks', comparableGroup: 'hanks' },
  { code: 'BUNDLE', name: 'Bundles', comparableGroup: 'bundles' },
  { code: 'METER', name: 'Meters', comparableGroup: 'length' },
  { code: 'KG', name: 'Kilograms', comparableGroup: 'weight' },
  { code: 'BAG', name: 'Bags', comparableGroup: 'bags' },
  { code: 'DRUM', name: 'Drums', comparableGroup: 'drums' },
] as const;

/** Buying / operations material categories. System rows are seeded per business. */
export const DEFAULT_MATERIAL_CATEGORIES = [
  { code: 'RODA', name: 'Roda', sortOrder: 1, requiresQuality: false, system: true },
  { code: 'EIGHTEEN_UP', name: '18/UP', sortOrder: 2, requiresQuality: false, system: true },
  { code: 'QUALITY', name: 'Quality', sortOrder: 3, requiresQuality: true, system: true },
] as const;
