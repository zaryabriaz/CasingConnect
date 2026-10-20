import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IncomingMaterial, Prisma, StockOpType } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { syncCasingQualities } from '../industry/sync-casing-qualities';
import { PrismaService } from '../prisma/prisma.service';
import { ConvertMaterialDto, ProductionDayQueryDto, SaveProductionDayDto } from './dto';

const MATERIAL_LABELS: Record<IncomingMaterial, string> = {
  RODA: 'Roda',
  EIGHTEEN_UP: '18/UP',
  QUALITY: 'Quality',
};

function qty(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(3).replace(/\.?0+$/, '') || '0';
}

function money(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(2).replace(/\.?0+$/, '') || '0';
}

type HeldKey = string;

function heldKey(membershipId: string | null | undefined, personName: string) {
  return membershipId ?? `name:${personName}`;
}

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  async day(actor: Actor, query: ProductionDayQueryDto) {
    const date = query.date;
    const businessId = requireBusinessId(actor);
    await syncCasingQualities(this.prisma, businessId);

    const casingTypes = await this.prisma.casingType.findMany({
      where: { businessId, active: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    });
    if (casingTypes.length === 0) {
      throw new BadRequestException('No active casing type. Enable sheep, beef, or another type in Catalogue.');
    }

    const casingType =
      (query.casingTypeId ? casingTypes.find((item) => item.id === query.casingTypeId) : null) ?? casingTypes[0]!;

    if (query.casingTypeId && casingType.id !== query.casingTypeId) {
      throw new NotFoundException('That casing type is not active in this business.');
    }

    const [qualities, issueLines, issueLinesToday, conversions, conversionsToday, entries, workers] =
      await Promise.all([
        this.prisma.quality.findMany({
          where: { businessId, active: true, casingTypeId: casingType.id },
          orderBy: { sortOrder: 'asc' },
        }),
        // Remaining with people = all issues minus all conversions (not only today).
        this.prisma.stockOperationLine.findMany({
          where: { operation: { businessId, type: StockOpType.ISSUE_TO_PERSON } },
          select: { membershipId: true, personName: true, materialForm: true, quantity: true },
        }),
        this.prisma.stockOperationLine.findMany({
          where: { operation: { businessId, type: StockOpType.ISSUE_TO_PERSON, date } },
          select: { membershipId: true, personName: true, materialForm: true, quantity: true },
        }),
        this.prisma.materialConversion.findMany({
          where: { businessId },
          select: {
            membershipId: true,
            personName: true,
            fromForm: true,
            fromQuantity: true,
            toForm: true,
            toQuantity: true,
          },
        }),
        this.prisma.materialConversion.findMany({
          where: { businessId, date },
          include: {
            hankLines: { include: { quality: { select: { id: true, name: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.productionEntry.findMany({
          where: { businessId, date, casingTypeId: casingType.id },
          include: { outputs: true },
        }),
        this.prisma.membership.findMany({
          where: { businessId, role: 'WORKER', active: true },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

    const held = this.buildHeldBalances(issueLines, conversions);

    const entryByKey = new Map(entries.map((entry) => [heldKey(entry.membershipId, entry.personName), entry]));
    const activeKeys = new Set<string>([
      ...entryByKey.keys(),
      ...issueLinesToday.map((row) => heldKey(row.membershipId, row.personName)),
      ...conversionsToday.map((row) => heldKey(row.membershipId, row.personName)),
    ]);
    for (const [key, row] of held.entries()) {
      const remaining = [...row.materials.values()].reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0));
      if (remaining.gt(0)) activeKeys.add(key);
    }
    const keys = [...activeKeys].sort((a, b) => {
      const nameA = held.get(a)?.personName ?? entryByKey.get(a)?.personName ?? a;
      const nameB = held.get(b)?.personName ?? entryByKey.get(b)?.personName ?? b;
      return nameA.localeCompare(nameB);
    });

    const qualityTotals = new Map<string, Prisma.Decimal>();
    const people = keys.map((key) => {
      const heldRow = held.get(key);
      const entry = entryByKey.get(key);
      const membershipId = heldRow?.membershipId ?? entry?.membershipId ?? null;
      const personName = heldRow?.personName ?? entry?.personName ?? '';

      const materials = heldRow?.materials ?? new Map<IncomingMaterial, Prisma.Decimal>();
      const remaining = [IncomingMaterial.RODA, IncomingMaterial.EIGHTEEN_UP, IncomingMaterial.QUALITY]
        .map((materialForm) => ({
          material: MATERIAL_LABELS[materialForm],
          materialForm,
          quantity: qty(materials.get(materialForm) ?? 0),
        }))
        .filter((row) => Number(row.quantity) > 0);
      const remainingTotal = [...materials.values()].reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0));

      const issuedGross = issueLinesToday
        .filter((line) => heldKey(line.membershipId, line.personName) === key)
        .reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0));

      const outputMap = new Map((entry?.outputs ?? []).map((line) => [line.qualityId, line.quantity]));
      const outputs = qualities.map((quality) => {
        const quantity = outputMap.get(quality.id) ?? new Prisma.Decimal(0);
        if (quantity.gt(0)) {
          qualityTotals.set(quality.id, (qualityTotals.get(quality.id) ?? new Prisma.Decimal(0)).plus(quantity));
        }
        return {
          qualityId: quality.id,
          quality: quality.name,
          quantity: quantity.gt(0) ? qty(quantity) : '',
        };
      });
      const producedTotal = outputs.reduce(
        (sum, line) => sum.plus(line.quantity ? line.quantity : 0),
        new Prisma.Decimal(0),
      );

      return {
        membershipId,
        personName,
        issued: remaining,
        issuedTotal: qty(remainingTotal),
        issuedGross: qty(issuedGross),
        remainingRoda: qty(materials.get(IncomingMaterial.RODA) ?? 0),
        remainingEighteenUp: qty(materials.get(IncomingMaterial.EIGHTEEN_UP) ?? 0),
        producedTotal: qty(producedTotal),
        notes: entry?.notes ?? '',
        outputs,
      };
    });

    const reportQualities = qualities
      .map((quality) => ({
        qualityId: quality.id,
        quality: quality.name,
        quantity: qty(qualityTotals.get(quality.id) ?? 0),
      }))
      .filter((row) => Number(row.quantity) > 0);

    const issuedToday = [...held.values()]
      .map((row) => ({
        membershipId: row.membershipId,
        personName: row.personName,
        materials: [...row.materials.entries()]
          .filter(([, quantity]) => quantity.gt(0))
          .map(([materialForm, quantity]) => ({
            material: MATERIAL_LABELS[materialForm],
            materialForm,
            quantity: qty(quantity),
          })),
        total: qty([...row.materials.values()].reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0))),
      }))
      .filter((row) => Number(row.total) > 0);

    const conversionsTodayView = conversionsToday.map((row) => ({
      id: row.id,
      reference: row.reference,
      personName: row.personName,
      membershipId: row.membershipId,
      fromForm: row.fromForm,
      fromMaterial: MATERIAL_LABELS[row.fromForm],
      fromQuantity: qty(row.fromQuantity),
      toForm: row.toForm,
      toMaterial: row.toForm ? MATERIAL_LABELS[row.toForm] : null,
      toQuantity: row.toForm ? qty(row.toQuantity ?? row.fromQuantity) : null,
      labourRate: row.labourRate == null ? null : money(row.labourRate),
      labourAmount: row.labourAmount == null ? null : money(row.labourAmount),
      hanks: row.hankLines.map((line) => ({
        qualityId: line.qualityId,
        quality: line.quality.name,
        quantity: qty(line.quantity),
      })),
      notes: row.notes,
    }));

    return {
      date,
      casingType,
      casingTypes,
      workers: workers
        .map((member) => ({ id: member.id, name: member.user.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      qualities: qualities.map((quality) => ({
        id: quality.id,
        name: quality.name,
        code: quality.code,
        casingTypeId: quality.casingTypeId,
      })),
      people,
      conversions: conversionsTodayView,
      report: {
        issuedToday,
        issuedTotal: qty(issuedToday.reduce((sum, row) => sum.plus(row.total), new Prisma.Decimal(0))),
        producedByQuality: reportQualities,
        producedTotal: qty(reportQualities.reduce((sum, row) => sum.plus(row.quantity), new Prisma.Decimal(0))),
        conversionsToday: conversionsTodayView.length,
      },
    };
  }

  async convert(actor: Actor, dto: ConvertMaterialDto) {
    const businessId = requireBusinessId(actor);
    const fromQuantity = new Prisma.Decimal(dto.fromQuantity);
    if (!fromQuantity.gt(0)) {
      throw new BadRequestException('Enter how much source material was used.');
    }

    const toHanks = Boolean(dto.outputs?.length);
    if (toHanks && dto.toForm) {
      throw new BadRequestException('Choose either 18/UP hanks, or finished quality — not both.');
    }
    if (!toHanks && !dto.toForm) {
      throw new BadRequestException('Choose 18/UP hanks, or finished quality.');
    }

    if (dto.fromForm !== IncomingMaterial.RODA && dto.fromForm !== IncomingMaterial.EIGHTEEN_UP) {
      throw new BadRequestException('Only Roda or 18/UP can be converted.');
    }
    if (dto.toForm && dto.toForm !== IncomingMaterial.EIGHTEEN_UP) {
      throw new BadRequestException('Raw conversion only supports Roda → 18/UP.');
    }
    if (dto.toForm === IncomingMaterial.EIGHTEEN_UP && dto.fromForm !== IncomingMaterial.RODA) {
      throw new BadRequestException('18/UP is made from Roda.');
    }

    let toQuantity: Prisma.Decimal | null = null;
    if (dto.toForm === IncomingMaterial.EIGHTEEN_UP) {
      const raw = dto.toQuantity?.trim() || dto.fromQuantity;
      toQuantity = new Prisma.Decimal(raw);
      if (!toQuantity.gt(0)) {
        throw new BadRequestException('Enter how many 18/UP hanks were made.');
      }
    }

    const worker = await this.prisma.membership.findFirst({
      where: { id: dto.membershipId, businessId, role: 'WORKER', active: true },
      include: { user: { select: { name: true } } },
    });
    if (!worker) {
      throw new BadRequestException('Choose a person with the Worker role under Users.');
    }

    const [issueLines, conversions] = await Promise.all([
      this.prisma.stockOperationLine.findMany({
        where: {
          membershipId: worker.id,
          operation: { businessId, type: StockOpType.ISSUE_TO_PERSON },
        },
        select: { membershipId: true, personName: true, materialForm: true, quantity: true },
      }),
      this.prisma.materialConversion.findMany({
        where: { businessId, membershipId: worker.id },
        select: {
          membershipId: true,
          personName: true,
          fromForm: true,
          fromQuantity: true,
          toForm: true,
          toQuantity: true,
        },
      }),
    ]);

    const held = this.buildHeldBalances(issueLines, conversions);
    const personHeld = held.get(heldKey(worker.id, worker.user.name));
    const available = personHeld?.materials.get(dto.fromForm) ?? new Prisma.Decimal(0);
    if (fromQuantity.gt(available)) {
      const eighteen = personHeld?.materials.get(IncomingMaterial.EIGHTEEN_UP) ?? new Prisma.Decimal(0);
      if (
        dto.fromForm === IncomingMaterial.RODA &&
        available.lte(0) &&
        eighteen.gt(0) &&
        dto.toForm === IncomingMaterial.EIGHTEEN_UP
      ) {
        throw new BadRequestException(
          `${worker.user.name} already converted their Roda into ${qty(eighteen)} 18/UP. Choose Work done → Quality to cut those hanks, or issue more Roda first.`,
        );
      }
      throw new BadRequestException(
        `${worker.user.name} only has ${qty(available)} ${MATERIAL_LABELS[dto.fromForm]} left with them (issued minus earlier conversions).`,
      );
    }

    let hankOutputs: Array<{ qualityId: string; quantity: Prisma.Decimal }> = [];
    let casingTypeId: string | null = null;

    if (toHanks) {
      if (!dto.casingTypeId) {
        throw new BadRequestException('Choose a casing type when cutting to finished qualities.');
      }
      casingTypeId = dto.casingTypeId;
      const casingType = await this.prisma.casingType.findFirst({
        where: { id: casingTypeId, businessId, active: true },
      });
      if (!casingType) throw new NotFoundException('That casing type is not active in this business.');

      hankOutputs = (dto.outputs ?? [])
        .map((line) => ({ qualityId: line.qualityId, quantity: new Prisma.Decimal(line.quantity) }))
        .filter((line) => line.quantity.gt(0));
      if (hankOutputs.length === 0) {
        throw new BadRequestException('Enter at least one finished quality quantity.');
      }

      const qualityIds = hankOutputs.map((line) => line.qualityId);
      const qualities = await this.prisma.quality.findMany({
        where: { businessId, casingTypeId, id: { in: qualityIds }, active: true },
      });
      if (qualities.length !== qualityIds.length) {
        throw new BadRequestException('One or more qualities do not belong to this casing type.');
      }
    }

    let labourRate: Prisma.Decimal | null = null;
    let labourAmount: Prisma.Decimal | null = null;
    if (dto.labourRate?.trim()) {
      labourRate = new Prisma.Decimal(dto.labourRate.trim());
      if (!labourRate.gt(0)) {
        throw new BadRequestException('Labour rate must be greater than zero.');
      }
      const hankCount = toHanks
        ? hankOutputs.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0))
        : (toQuantity ?? fromQuantity);
      labourAmount = labourRate.mul(hankCount).toDecimalPlaces(2);
    }

    await this.prisma.$transaction(async (tx) => {
      const reference = await this.nextReference(tx, businessId, 'convert', 'CNV');
      await tx.materialConversion.create({
        data: {
          businessId,
          reference,
          date: dto.date,
          membershipId: worker.id,
          personName: worker.user.name,
          fromForm: dto.fromForm,
          fromQuantity,
          toForm: dto.toForm ?? null,
          toQuantity,
          labourRate,
          labourAmount,
          casingTypeId,
          notes: dto.notes?.trim() || null,
          // Qualities only when Work done is finished quality — never for 18/UP.
          hankLines: toHanks && hankOutputs.length
            ? {
                create: hankOutputs.map((line) => ({
                  qualityId: line.qualityId,
                  quantity: line.quantity,
                })),
              }
            : undefined,
        },
      });

      if (hankOutputs.length && casingTypeId) {
        const existing = await tx.productionEntry.findFirst({
          where: {
            businessId,
            date: dto.date,
            casingTypeId,
            membershipId: worker.id,
          },
          include: { outputs: true },
        });

        const entry =
          existing ??
          (await tx.productionEntry.create({
            data: {
              businessId,
              casingTypeId,
              membershipId: worker.id,
              date: dto.date,
              personName: worker.user.name,
            },
            include: { outputs: true },
          }));

        for (const line of hankOutputs) {
          const current = entry.outputs.find((item) => item.qualityId === line.qualityId);
          if (current) {
            await tx.productionOutputLine.update({
              where: { id: current.id },
              data: { quantity: current.quantity.plus(line.quantity) },
            });
          } else {
            await tx.productionOutputLine.create({
              data: {
                entryId: entry.id,
                qualityId: line.qualityId,
                quantity: line.quantity,
              },
            });
          }
        }
      }
    });

    return this.day(actor, { date: dto.date, casingTypeId: casingTypeId ?? undefined });
  }

  async saveDay(actor: Actor, dto: SaveProductionDayDto) {
    const casingType = await this.prisma.casingType.findFirst({
      where: { id: dto.casingTypeId, businessId: requireBusinessId(actor), active: true },
    });
    if (!casingType) throw new NotFoundException('That casing type is not active in this business.');

    const membershipIds = [...new Set(dto.people.map((person) => person.membershipId))];
    const workers = await this.prisma.membership.findMany({
      where: {
        businessId: requireBusinessId(actor),
        id: { in: membershipIds },
        role: 'WORKER',
        active: true,
      },
      include: { user: { select: { name: true } } },
    });
    if (workers.length !== membershipIds.length) {
      throw new BadRequestException('Choose people with the Worker role under Users.');
    }
    const workerName = new Map(workers.map((member) => [member.id, member.user.name]));

    const qualityIds = [...new Set(dto.people.flatMap((person) => person.outputs.map((line) => line.qualityId)))];
    const qualities = await this.prisma.quality.findMany({
      where: {
        businessId: requireBusinessId(actor),
        casingTypeId: casingType.id,
        id: { in: qualityIds },
        active: true,
      },
    });
    if (qualities.length !== qualityIds.length) {
      throw new BadRequestException('One or more qualities do not belong to this casing type.');
    }

    const keptMembershipIds = membershipIds;

    await this.prisma.$transaction(async (tx) => {
      await tx.productionEntry.deleteMany({
        where: {
          businessId: requireBusinessId(actor),
          date: dto.date,
          casingTypeId: casingType.id,
          ...(keptMembershipIds.length ? { membershipId: { notIn: keptMembershipIds } } : {}),
        },
      });

      for (const person of dto.people) {
        const personName = workerName.get(person.membershipId)!;
        const outputs = person.outputs
          .map((line) => ({
            qualityId: line.qualityId,
            quantity: new Prisma.Decimal(line.quantity),
          }))
          .filter((line) => line.quantity.gt(0));

        if (outputs.length === 0 && !person.notes?.trim()) {
          await tx.productionEntry.deleteMany({
            where: {
              businessId: requireBusinessId(actor),
              date: dto.date,
              membershipId: person.membershipId,
              casingTypeId: casingType.id,
            },
          });
          continue;
        }

        const existing = await tx.productionEntry.findFirst({
          where: {
            businessId: requireBusinessId(actor),
            date: dto.date,
            casingTypeId: casingType.id,
            membershipId: person.membershipId,
          },
        });

        const entry = existing
          ? await tx.productionEntry.update({
              where: { id: existing.id },
              data: { personName, notes: person.notes?.trim() || null },
            })
          : await tx.productionEntry.create({
              data: {
                businessId: requireBusinessId(actor),
                casingTypeId: casingType.id,
                membershipId: person.membershipId,
                date: dto.date,
                personName,
                notes: person.notes?.trim() || null,
              },
            });

        await tx.productionOutputLine.deleteMany({ where: { entryId: entry.id } });
        if (outputs.length) {
          await tx.productionOutputLine.createMany({
            data: outputs.map((line) => ({
              entryId: entry.id,
              qualityId: line.qualityId,
              quantity: line.quantity,
            })),
          });
        }
      }
    });

    return this.day(actor, { date: dto.date, casingTypeId: casingType.id });
  }

  private buildHeldBalances(
    issueLines: Array<{
      membershipId: string | null;
      personName: string;
      materialForm: IncomingMaterial;
      quantity: Prisma.Decimal;
    }>,
    conversions: Array<{
      membershipId: string | null;
      personName: string;
      fromForm: IncomingMaterial;
      fromQuantity: Prisma.Decimal;
      toForm: IncomingMaterial | null;
      toQuantity?: Prisma.Decimal | null;
    }>,
  ) {
    const held = new Map<
      HeldKey,
      { membershipId: string | null; personName: string; materials: Map<IncomingMaterial, Prisma.Decimal> }
    >();

    const touch = (membershipId: string | null, personName: string) => {
      const key = heldKey(membershipId, personName);
      const row = held.get(key) ?? {
        membershipId,
        personName,
        materials: new Map<IncomingMaterial, Prisma.Decimal>(),
      };
      held.set(key, row);
      return row;
    };

    for (const line of issueLines) {
      const row = touch(line.membershipId, line.personName);
      row.materials.set(
        line.materialForm,
        (row.materials.get(line.materialForm) ?? new Prisma.Decimal(0)).plus(line.quantity),
      );
    }

    for (const conversion of conversions) {
      const row = touch(conversion.membershipId, conversion.personName);
      row.materials.set(
        conversion.fromForm,
        (row.materials.get(conversion.fromForm) ?? new Prisma.Decimal(0)).minus(conversion.fromQuantity),
      );
      if (conversion.toForm) {
        const gained = conversion.toQuantity ?? conversion.fromQuantity;
        row.materials.set(
          conversion.toForm,
          (row.materials.get(conversion.toForm) ?? new Prisma.Decimal(0)).plus(gained),
        );
      }
    }

    for (const row of held.values()) {
      for (const [form, quantity] of row.materials.entries()) {
        if (quantity.lt(0)) row.materials.set(form, new Prisma.Decimal(0));
      }
    }

    return held;
  }

  private async nextReference(
    tx: Prisma.TransactionClient,
    businessId: string,
    key: string,
    prefix: string,
  ) {
    const current = await tx.sequence.upsert({
      where: { businessId_key: { businessId, key } },
      update: { value: { increment: 1 } },
      create: { businessId, key, value: 1 },
    });
    return `${prefix}-${String(current.value).padStart(4, '0')}`;
  }
}
