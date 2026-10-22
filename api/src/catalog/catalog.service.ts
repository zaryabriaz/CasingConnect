import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Actor, requireBusinessId } from '../common/actor';
import { isUniqueConflict } from '../common/prisma-errors';
import { clean, hasAny } from '../common/text';
import { DEFAULT_MATERIAL_CATEGORIES, QUALITY_GRADES } from '../industry/defaults';
import { syncCasingQualities } from '../industry/sync-casing-qualities';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCasingTypeDto,
  CreateMaterialCategoryDto,
  CreateQualityDto,
  CreateUnitDto,
  UpdateCasingTypeDto,
  UpdateMaterialCategoryDto,
  UpdateQualityDto,
  UpdateUnitDto,
} from './dto';
import { presentMaterialCategory, slugMaterialCategoryCode } from './material-category';

const DIAMETER_ONLY = /^(\d+\/\d+|\d+\/\+)$/i;
const GRADED_QUALITY = /^(\d+\/\d+|\d+\/\+)\s+(AB|A|C)$/i;
const MULTI_GRADE = /^(\d+\/\d+|\d+\/\+)\s+([A-Za-z]+(?:\s*,\s*[A-Za-z]+)+)$/i;

function normalizeGrade(value: string): string | null {
  const grade = value.trim().toUpperCase();
  return (QUALITY_GRADES as readonly string[]).includes(grade) ? grade : null;
}

function qualityNamesFromInput(raw: string): string[] {
  const name = clean(raw).replace(/\s*,\s*/g, ',');
  if (DIAMETER_ONLY.test(name)) {
    return QUALITY_GRADES.map((grade) => `${name} ${grade}`);
  }

  const multi = name.match(MULTI_GRADE);
  if (multi) {
    const diameter = multi[1]!;
    const grades = [...new Set(
      multi[2]!
        .split(',')
        .map((part) => normalizeGrade(part))
        .filter((grade): grade is string => Boolean(grade)),
    )];
    if (grades.length === 0) {
      throw new BadRequestException('Use grades AB, A, or C — for example 26/28 or 26/28 A,AB,C.');
    }
    // Keep catalogue order AB, A, C when present.
    const ordered = QUALITY_GRADES.filter((grade) => grades.includes(grade));
    return ordered.map((grade) => `${diameter} ${grade}`);
  }

  const graded = name.match(GRADED_QUALITY);
  if (graded) {
    const diameter = graded[1]!;
    const grade = graded[2]!.toUpperCase();
    return [`${diameter} ${grade}`];
  }
  return [name];
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCasingTypes(actor: Actor) {
    await this.ensureSheepGrades(requireBusinessId(actor));
    const types = await this.prisma.casingType.findMany({
      where: { businessId: requireBusinessId(actor) },
      include: { qualities: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { code: 'asc' },
    });
    return types.map((type) => ({
      id: type.id,
      code: type.code,
      name: type.name,
      active: type.active,
      qualities: type.qualities.map((quality) => ({
        id: quality.id,
        casingTypeId: quality.casingTypeId,
        code: quality.code,
        name: quality.name,
        sortOrder: quality.sortOrder,
        active: quality.active,
      })),
    }));
  }

  async createCasingType(actor: Actor, dto: CreateCasingTypeDto) {
    try {
      const created = await this.prisma.casingType.create({
        data: {
          businessId: requireBusinessId(actor),
          code: dto.code.trim().toUpperCase(),
          name: clean(dto.name),
        },
      });
      return { id: created.id, code: created.code, name: created.name, active: created.active, qualities: [] };
    } catch (error) {
      if (isUniqueConflict(error)) throw new ConflictException('This business already has that casing type.');
      throw error;
    }
  }

  async updateCasingType(actor: Actor, id: string, dto: UpdateCasingTypeDto) {
    if (!hasAny(dto)) throw new BadRequestException('Provide a field to update.');
    await this.requireType(requireBusinessId(actor), id);
    const updated = await this.prisma.casingType.update({
      where: { id },
      data: { name: dto.name === undefined ? undefined : clean(dto.name), active: dto.active },
      include: { qualities: { orderBy: { sortOrder: 'asc' } } },
    });
    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      active: updated.active,
      qualities: updated.qualities.map((quality) => ({
        id: quality.id,
        casingTypeId: quality.casingTypeId,
        code: quality.code,
        name: quality.name,
        sortOrder: quality.sortOrder,
        active: quality.active,
      })),
    };
  }

  async createQuality(actor: Actor, casingTypeId: string, dto: CreateQualityDto) {
    await this.requireType(requireBusinessId(actor), casingTypeId);
    const names = qualityNamesFromInput(dto.name || dto.code);
    if (names.length === 0) {
      throw new BadRequestException('Enter a diameter such as 26/28 (creates AB, A, C) or a full quality like 26/28 AB.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const last = await tx.quality.findFirst({
          where: { casingTypeId },
          orderBy: { sortOrder: 'desc' },
        });
        let sortOrder = last?.sortOrder ?? 0;
        const created = [];
        for (const name of names) {
          sortOrder += 1;
          const row = await tx.quality.create({
            data: {
              businessId: requireBusinessId(actor),
              casingTypeId,
              code: name,
              name,
              sortOrder,
            },
            select: { id: true, casingTypeId: true, code: true, name: true, sortOrder: true, active: true },
          });
          created.push(row);
        }
        return created;
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ConflictException(
          names.length > 1
            ? 'This diameter already has one or more of AB / A / C. Delete the bare diameter first, or add a single missing grade like 26/28 AB.'
            : 'This casing type already has that quality.',
        );
      }
      throw error;
    }
  }

  async updateQuality(actor: Actor, id: string, dto: UpdateQualityDto) {
    if (!hasAny(dto)) throw new BadRequestException('Provide a field to update.');
    const quality = await this.prisma.quality.findFirst({ where: { id, businessId: requireBusinessId(actor) } });
    if (!quality) throw new NotFoundException('That quality was not found in this business.');
    try {
      return await this.prisma.quality.update({
        where: { id },
        data: {
          code: dto.code === undefined ? undefined : clean(dto.code),
          name: dto.name === undefined ? undefined : clean(dto.name),
          sortOrder: dto.sortOrder,
          active: dto.active,
        },
        select: { id: true, casingTypeId: true, code: true, name: true, sortOrder: true, active: true },
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw new ConflictException('This casing type already has that quality.');
      throw error;
    }
  }

  async deleteQuality(actor: Actor, id: string) {
    const quality = await this.prisma.quality.findFirst({ where: { id, businessId: requireBusinessId(actor) } });
    if (!quality) throw new NotFoundException('That quality was not found in this business.');

    const [productionCount, saleCount] = await Promise.all([
      this.prisma.productionOutputLine.count({ where: { qualityId: id } }),
      this.prisma.saleLine.count({ where: { qualityId: id } }),
    ]);
    if (productionCount > 0 || saleCount > 0) {
      throw new BadRequestException(
        'This quality is already used in production or sales. Turn it off instead of deleting.',
      );
    }

    await this.prisma.quality.delete({ where: { id } });
    return { id };
  }

  async listUnits(actor: Actor) {
    return this.prisma.unit.findMany({
      where: { businessId: requireBusinessId(actor) },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, comparableGroup: true },
    });
  }

  async listMaterialCategories(actor: Actor) {
    await this.ensureMaterialCategories(requireBusinessId(actor));
    const rows = await this.prisma.materialCategory.findMany({
      where: { businessId: requireBusinessId(actor) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(presentMaterialCategory);
  }

  async createMaterialCategory(actor: Actor, dto: CreateMaterialCategoryDto) {
    const businessId = requireBusinessId(actor);
    await this.ensureMaterialCategories(businessId);
    const name = clean(dto.name);
    let code = (dto.code?.trim() || slugMaterialCategoryCode(name)).toUpperCase();
    if (['RODA', 'EIGHTEEN_UP', 'QUALITY'].includes(code)) {
      throw new BadRequestException('That code is reserved for a built-in material category.');
    }
    const last = await this.prisma.materialCategory.findFirst({
      where: { businessId },
      orderBy: { sortOrder: 'desc' },
    });
    try {
      const created = await this.prisma.materialCategory.create({
        data: {
          businessId,
          code,
          name,
          sortOrder: (last?.sortOrder ?? 10) + 1,
          requiresQuality: false,
          system: false,
          active: true,
        },
      });
      return presentMaterialCategory(created);
    } catch (error) {
      if (isUniqueConflict(error)) {
        // Retry once with a numeric suffix if the slug collided.
        code = `${code.slice(0, 16)}_${Math.floor(Math.random() * 90 + 10)}`;
        try {
          const created = await this.prisma.materialCategory.create({
            data: {
              businessId,
              code,
              name,
              sortOrder: (last?.sortOrder ?? 10) + 1,
              requiresQuality: false,
              system: false,
              active: true,
            },
          });
          return presentMaterialCategory(created);
        } catch (retryError) {
          if (isUniqueConflict(retryError)) {
            throw new ConflictException('This business already has that material category.');
          }
          throw retryError;
        }
      }
      throw error;
    }
  }

  async updateMaterialCategory(actor: Actor, id: string, dto: UpdateMaterialCategoryDto) {
    if (!hasAny(dto)) throw new BadRequestException('Provide a field to update.');
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.materialCategory.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException('That material category was not found.');
    const updated = await this.prisma.materialCategory.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : clean(dto.name),
        sortOrder: dto.sortOrder,
        active: dto.active,
      },
    });
    return presentMaterialCategory(updated);
  }

  async deleteMaterialCategory(actor: Actor, id: string) {
    const businessId = requireBusinessId(actor);
    const existing = await this.prisma.materialCategory.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException('That material category was not found.');
    if (existing.system) {
      throw new BadRequestException('Built-in categories cannot be deleted. Turn them off instead.');
    }
    const [receiptCount, lineCount] = await Promise.all([
      this.prisma.materialReceipt.count({ where: { materialCategoryId: id } }),
      this.prisma.stockOperationLine.count({ where: { materialCategoryId: id } }),
    ]);
    if (receiptCount > 0 || lineCount > 0) {
      throw new BadRequestException(
        'This category is already used in buying or stock. Turn it off instead of deleting.',
      );
    }
    await this.prisma.materialCategory.delete({ where: { id } });
    return { id };
  }

  async ensureMaterialCategories(businessId: string) {
    const count = await this.prisma.materialCategory.count({ where: { businessId } });
    if (count > 0) return;
    await this.prisma.materialCategory.createMany({
      data: DEFAULT_MATERIAL_CATEGORIES.map((row) => ({ businessId, ...row })),
      skipDuplicates: true,
    });
  }

  async createUnit(actor: Actor, dto: CreateUnitDto) {
    try {
      return await this.prisma.unit.create({
        data: {
          businessId: requireBusinessId(actor),
          code: dto.code.trim().toUpperCase(),
          name: clean(dto.name),
          comparableGroup: dto.comparableGroup.trim().toLowerCase(),
        },
        select: { id: true, code: true, name: true, comparableGroup: true },
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw new ConflictException('This business already has that unit.');
      throw error;
    }
  }

  async updateUnit(actor: Actor, id: string, dto: UpdateUnitDto) {
    if (!hasAny(dto)) throw new BadRequestException('Provide a field to update.');
    const unit = await this.prisma.unit.findFirst({ where: { id, businessId: requireBusinessId(actor) } });
    if (!unit) throw new NotFoundException('That unit was not found in this business.');
    return this.prisma.unit.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : clean(dto.name),
        comparableGroup: dto.comparableGroup?.trim().toLowerCase(),
      },
      select: { id: true, code: true, name: true, comparableGroup: true },
    });
  }

  private ensureSheepGrades(businessId: string) {
    return syncCasingQualities(this.prisma, businessId);
  }

  private async requireType(businessId: string, id: string) {
    const casingType = await this.prisma.casingType.findFirst({ where: { id, businessId } });
    if (!casingType) throw new NotFoundException('That casing type was not found in this business.');
    return casingType;
  }
}

export { incomingFormFromCategoryCode } from './material-category';
