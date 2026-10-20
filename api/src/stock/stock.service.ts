import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IncomingMaterial, PackageStatus, Prisma, StockOpType } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { PrismaService } from '../prisma/prisma.service';
import { IssueToPersonDto, TransferToFactoryDto } from './dto';

const LABELS: Record<IncomingMaterial, string> = {
  RODA: 'Roda',
  EIGHTEEN_UP: '18/UP',
  QUALITY: 'Quality',
};

type IssueTake = {
  id: string;
  packageNumber: string;
  bagQuantity: Prisma.Decimal;
  takeQuantity: Prisma.Decimal;
  status: PackageStatus;
  materialForm: IncomingMaterial;
  partial: boolean;
};

function qty(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(3).replace(/\.?0+$/, '') || '0';
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async factory(actor: Actor) {
    const businessId = requireBusinessId(actor);
    await this.reconcileIssuePackages(businessId);

    const balances = await this.factoryBalances(businessId);
    const [packages, recent, people, conversions, conversionLog, productionOutputs, soldLines, partialTakes] =
      await Promise.all([
        this.prisma.materialPackage.findMany({
          where: {
            businessId,
            status: { in: [PackageStatus.IN_FACTORY, PackageStatus.ISSUED] },
          },
          include: { receipt: { select: { reference: true, materialForm: true, qualityText: true } } },
          orderBy: [{ status: 'desc' }, { kind: 'asc' }, { packageNumber: 'asc' }],
        }),
        this.prisma.stockOperation.findMany({
          where: { businessId },
          include: {
            lines: true,
            packages: { include: { package: { select: { kind: true, packageNumber: true, quantity: true } } } },
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 30,
        }),
        this.prisma.stockOperationLine.findMany({
          where: { operation: { businessId, type: StockOpType.ISSUE_TO_PERSON } },
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
          where: { businessId },
          include: {
            hankLines: { include: { quality: { select: { id: true, name: true } } } },
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 30,
        }),
        this.prisma.productionOutputLine.findMany({
          where: { entry: { businessId } },
          select: {
            quantity: true,
            quality: { select: { id: true, name: true } },
            entry: { select: { personName: true, membershipId: true } },
          },
        }),
        this.prisma.saleLine.groupBy({
          by: ['qualityId'],
          where: { sale: { businessId } },
          _sum: { quantity: true },
        }),
        this.prisma.stockOperationPackage.findMany({
          where: {
            operation: { businessId, type: StockOpType.ISSUE_TO_PERSON },
            package: { status: PackageStatus.IN_FACTORY },
          },
          select: { packageId: true, quantity: true },
        }),
      ]);

    const usedFromBag = new Map<string, Prisma.Decimal>();
    for (const row of partialTakes) {
      usedFromBag.set(row.packageId, (usedFromBag.get(row.packageId) ?? new Prisma.Decimal(0)).plus(row.quantity));
    }

    const held = this.heldWithPeople(people, conversions);
    const withPeopleByForm = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const row of held.values()) {
      for (const [form, quantity] of row.materials.entries()) {
        if (!quantity.gt(0)) continue;
        withPeopleByForm.set(form, (withPeopleByForm.get(form) ?? new Prisma.Decimal(0)).plus(quantity));
      }
    }

    const soldByQuality = new Map(soldLines.map((row) => [row.qualityId, row._sum.quantity ?? new Prisma.Decimal(0)]));
    const finishedMap = new Map<
      string,
      { qualityId: string; quality: string; quantity: Prisma.Decimal; people: Set<string> }
    >();
    for (const line of productionOutputs) {
      const row = finishedMap.get(line.quality.id) ?? {
        qualityId: line.quality.id,
        quality: line.quality.name,
        quantity: new Prisma.Decimal(0),
        people: new Set<string>(),
      };
      row.quantity = row.quantity.plus(line.quantity);
      if (line.entry.personName) row.people.add(line.entry.personName);
      finishedMap.set(line.quality.id, row);
    }
    const finishedQualities = [...finishedMap.values()]
      .map((row) => {
        const soldQty = soldByQuality.get(row.qualityId) ?? new Prisma.Decimal(0);
        const available = row.quantity.minus(soldQty);
        return {
          qualityId: row.qualityId,
          quality: row.quality,
          produced: qty(row.quantity),
          sold: qty(soldQty),
          available: qty(available.lt(0) ? new Prisma.Decimal(0) : available),
          people: [...row.people].sort((a, b) => a.localeCompare(b)),
        };
      })
      .filter((row) => Number(row.available) > 0 || Number(row.produced) > 0)
      .sort((a, b) => a.quality.localeCompare(b.quality));

    const finishedAvailableTotal = finishedQualities.reduce(
      (sum, row) => sum.plus(row.available),
      new Prisma.Decimal(0),
    );

    const stockRecent = recent.map((op) => ({
      ...this.presentOperation(op),
      kind: 'STOCK' as const,
      sortAt: op.createdAt?.toISOString?.() ?? `${op.date}T00:00:00.000Z`,
    }));
    const conversionRecent = conversionLog.map((row) => ({
      id: row.id,
      reference: row.reference,
      date: row.date,
      type: 'CONVERT' as const,
      kind: 'CONVERT' as const,
      notes: row.notes,
      lines: [
        {
          personName: row.personName,
          material: LABELS[row.fromForm],
          materialForm: row.fromForm,
          quantity: qty(row.fromQuantity),
        },
      ],
      packages: [] as Array<{ kind: string; packageNumber: string; quantity: string }>,
      detail: row.toForm
        ? `${row.personName}: ${LABELS[row.fromForm]} ${qty(row.fromQuantity)} → ${LABELS[row.toForm]} ${qty(row.toQuantity ?? row.fromQuantity)}`
        : `${row.personName}: ${LABELS[row.fromForm]} ${qty(row.fromQuantity)} → ${row.hankLines
            .map((line) => `${line.quality.name} ${qty(line.quantity)}`)
            .join(', ')}`,
      sortAt: row.createdAt.toISOString(),
    }));

    const recentMixed = [...stockRecent, ...conversionRecent]
      .sort((a, b) => b.sortAt.localeCompare(a.sortAt) || b.date.localeCompare(a.date))
      .slice(0, 40)
      .map(({ sortAt: _sortAt, ...row }) => row);

    return {
      balances: balances.map((row) => {
        const withPeople = withPeopleByForm.get(row.materialForm) ?? new Prisma.Decimal(0);
        if (row.materialForm === IncomingMaterial.EIGHTEEN_UP) {
          return {
            material: LABELS[row.materialForm],
            materialForm: row.materialForm,
            available: qty(withPeople.plus(row.available)),
            atFactoryBags: qty(row.inFactoryPackages),
            boughtAtFactory: qty(row.boughtAtFactory),
            transferredIn: qty(row.transferredIn),
            issued: qty(row.issued),
            withPeople: qty(withPeople),
            note: 'From production (Roda → 18/UP) still with workers, plus any factory bags',
          };
        }
        if (row.materialForm === IncomingMaterial.QUALITY) {
          return {
            material: 'Finished',
            materialForm: row.materialForm,
            available: qty(finishedAvailableTotal),
            atFactoryBags: '0',
            boughtAtFactory: '0',
            transferredIn: '0',
            issued: '0',
            withPeople: '0',
            note: 'Finished qualities from production (not yet sold)',
          };
        }
        return {
          material: LABELS[row.materialForm],
          materialForm: row.materialForm,
          available: qty(row.available),
          atFactoryBags: qty(row.inFactoryPackages),
          boughtAtFactory: qty(row.boughtAtFactory),
          transferredIn: qty(row.transferredIn),
          issued: qty(row.issued),
          withPeople: qty(withPeople),
          note: null as string | null,
        };
      }),
      packages: packages.map((item) => {
        const used = usedFromBag.get(item.id);
        return {
          id: item.id,
          kind: item.kind,
          packageNumber: item.packageNumber,
          quantity: qty(item.quantity),
          batch: item.receipt.reference,
          material: item.receipt.qualityText,
          materialForm: item.receipt.materialForm,
          status: item.status === PackageStatus.ISSUED ? 'UTILIZED' : 'AT_FACTORY',
          issuedTo: item.issuedTo,
          usedQuantity: used && used.gt(0) ? qty(used) : null,
        };
      }),
      withPeople: [...held.values()]
        .map((row) => ({
          membershipId: row.membershipId,
          personName: row.personName,
          materials: [...row.materials.entries()]
            .filter(([, quantity]) => quantity.gt(0))
            .map(([materialForm, quantity]) => ({
              material: LABELS[materialForm],
              materialForm,
              quantity: qty(quantity),
            })),
        }))
        .filter((row) => row.materials.length > 0)
        .sort((a, b) => a.personName.localeCompare(b.personName)),
      finishedQualities,
      recent: recentMixed,
    };
  }

  async overview(actor: Actor) {
    const businessId = requireBusinessId(actor);
    const materials = [IncomingMaterial.RODA, IncomingMaterial.EIGHTEEN_UP, IncomingMaterial.QUALITY];

    const [storePackages, factoryBalances, issueLines, conversions, productionOutputs, soldLines] =
      await Promise.all([
        this.prisma.materialPackage.findMany({
          where: { businessId, status: PackageStatus.IN_STORE },
          select: { quantity: true, receipt: { select: { materialForm: true } } },
        }),
        this.factoryBalances(businessId),
        this.prisma.stockOperationLine.findMany({
          where: { operation: { businessId, type: StockOpType.ISSUE_TO_PERSON } },
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
        this.prisma.productionOutputLine.findMany({
          where: { entry: { businessId } },
          select: {
            quantity: true,
            quality: { select: { id: true, name: true, casingType: { select: { id: true, name: true } } } },
          },
        }),
        this.prisma.saleLine.groupBy({
          by: ['qualityId'],
          where: { sale: { businessId } },
          _sum: { quantity: true },
        }),
      ]);

    const storeByMaterial = new Map<IncomingMaterial, Prisma.Decimal>();
    let storeTotal = new Prisma.Decimal(0);
    for (const item of storePackages) {
      storeByMaterial.set(
        item.receipt.materialForm,
        (storeByMaterial.get(item.receipt.materialForm) ?? new Prisma.Decimal(0)).plus(item.quantity),
      );
      storeTotal = storeTotal.plus(item.quantity);
    }

    const factoryByMaterial = new Map<IncomingMaterial, Prisma.Decimal>();
    let factoryTotal = new Prisma.Decimal(0);
    for (const row of factoryBalances) {
      if (row.available.gt(0)) {
        factoryByMaterial.set(row.materialForm, row.available);
        factoryTotal = factoryTotal.plus(row.available);
      }
    }

    const held = this.heldWithPeople(issueLines, conversions);
    const withWorkersByMaterial = new Map<IncomingMaterial, Prisma.Decimal>();
    let withWorkersTotal = new Prisma.Decimal(0);
    for (const row of held.values()) {
      for (const [materialForm, quantity] of row.materials.entries()) {
        if (!quantity.gt(0)) continue;
        withWorkersByMaterial.set(
          materialForm,
          (withWorkersByMaterial.get(materialForm) ?? new Prisma.Decimal(0)).plus(quantity),
        );
        withWorkersTotal = withWorkersTotal.plus(quantity);
      }
    }

    const producedByQuality = new Map<
      string,
      { qualityId: string; quality: string; casingType: string; quantity: Prisma.Decimal }
    >();
    let producedTotal = new Prisma.Decimal(0);
    for (const line of productionOutputs) {
      const key = line.quality.id;
      const row = producedByQuality.get(key) ?? {
        qualityId: line.quality.id,
        quality: line.quality.name,
        casingType: line.quality.casingType.name,
        quantity: new Prisma.Decimal(0),
      };
      row.quantity = row.quantity.plus(line.quantity);
      producedByQuality.set(key, row);
      producedTotal = producedTotal.plus(line.quantity);
    }

    const soldByQuality = new Map(soldLines.map((row) => [row.qualityId, row._sum.quantity ?? new Prisma.Decimal(0)]));
    let soldTotal = new Prisma.Decimal(0);
    let availableTotal = new Prisma.Decimal(0);
    const finishedQualities = [...producedByQuality.values()]
      .map((row) => {
        const soldQty = soldByQuality.get(row.qualityId) ?? new Prisma.Decimal(0);
        const availableQty = row.quantity.minus(soldQty);
        const available = availableQty.lt(0) ? new Prisma.Decimal(0) : availableQty;
        soldTotal = soldTotal.plus(soldQty);
        availableTotal = availableTotal.plus(available);
        return {
          qualityId: row.qualityId,
          quality: row.quality,
          casingType: row.casingType,
          produced: qty(row.quantity),
          sold: qty(soldQty),
          available: qty(available),
        };
      })
      .sort((a, b) => a.casingType.localeCompare(b.casingType) || a.quality.localeCompare(b.quality));

    const materialRows = (map: Map<IncomingMaterial, Prisma.Decimal>) =>
      materials
        .map((form) => ({
          material: LABELS[form],
          materialForm: form,
          quantity: qty(map.get(form) ?? 0),
        }))
        .filter((row) => Number(row.quantity) > 0);

    const rawMaterials = materials
      .map((form) => {
        const store = storeByMaterial.get(form) ?? new Prisma.Decimal(0);
        const factory = factoryByMaterial.get(form) ?? new Prisma.Decimal(0);
        const withWorkers = withWorkersByMaterial.get(form) ?? new Prisma.Decimal(0);
        const total = store.plus(factory).plus(withWorkers);
        return {
          material: LABELS[form],
          materialForm: form,
          store: qty(store),
          factory: qty(factory),
          withWorkers: qty(withWorkers),
          total: qty(total),
        };
      })
      .filter((row) => Number(row.total) > 0);

    const rawTotal = storeTotal.plus(factoryTotal).plus(withWorkersTotal);

    return {
      store: {
        total: qty(storeTotal),
        materials: materialRows(storeByMaterial),
      },
      factory: {
        total: qty(factoryTotal),
        materials: materialRows(factoryByMaterial),
      },
      withWorkers: {
        total: qty(withWorkersTotal),
        materials: materialRows(withWorkersByMaterial),
        people: [...held.values()]
          .map((row) => ({
            personName: row.personName,
            total: qty([...row.materials.values()].reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0))),
            materials: [...row.materials.entries()].map(([materialForm, quantity]) => ({
              material: LABELS[materialForm],
              materialForm,
              quantity: qty(quantity),
            })),
          }))
          .sort((a, b) => a.personName.localeCompare(b.personName)),
      },
      production: {
        total: qty(producedTotal),
        qualities: finishedQualities.map((row) => ({
          qualityId: row.qualityId,
          quality: row.quality,
          casingType: row.casingType,
          quantity: row.produced,
        })),
      },
      rawMaterials,
      finished: {
        totalProduced: qty(producedTotal),
        totalSold: qty(soldTotal),
        totalAvailable: qty(availableTotal),
        qualities: finishedQualities,
      },
      totals: {
        raw: qty(rawTotal),
        store: qty(storeTotal),
        factory: qty(factoryTotal),
        withWorkers: qty(withWorkersTotal),
        produced: qty(producedTotal),
        sold: qty(soldTotal),
        available: qty(availableTotal),
      },
    };
  }

  async storePackages(actor: Actor) {
    const packages = await this.prisma.materialPackage.findMany({
      where: { businessId: requireBusinessId(actor), status: PackageStatus.IN_STORE },
      include: { receipt: { select: { reference: true, materialForm: true, qualityText: true, date: true } } },
      orderBy: [{ receipt: { date: 'desc' } }, { kind: 'asc' }, { packageNumber: 'asc' }],
    });
    return packages.map((item) => ({
      id: item.id,
      kind: item.kind,
      packageNumber: item.packageNumber,
      quantity: qty(item.quantity),
      batch: item.receipt.reference,
      material: item.receipt.qualityText,
      materialForm: item.receipt.materialForm,
      date: item.receipt.date,
    }));
  }

  async transferToFactory(actor: Actor, dto: TransferToFactoryDto) {
    const uniqueIds = [...new Set(dto.packageIds)];
    const packages = await this.prisma.materialPackage.findMany({
      where: { businessId: requireBusinessId(actor), id: { in: uniqueIds } },
      include: { receipt: true },
    });
    if (packages.length !== uniqueIds.length) {
      throw new NotFoundException('One or more bags or drums were not found in this business.');
    }
    const notInStore = packages.filter((item) => item.status !== PackageStatus.IN_STORE);
    if (notInStore.length) {
      throw new BadRequestException('Only bags and drums that are still in the store can move to the factory.');
    }

    const movedQty = packages.reduce((sum, item) => sum.plus(item.quantity), new Prisma.Decimal(0));

    const created = await this.prisma.$transaction(async (tx) => {
      const reference = await this.nextReference(tx, requireBusinessId(actor), 'transfer', 'TRF');
      const operation = await tx.stockOperation.create({
        data: {
          businessId: requireBusinessId(actor),
          reference,
          date: dto.date,
          type: StockOpType.STORE_TO_FACTORY,
          notes: dto.notes?.trim() || null,
          packages: {
            create: packages.map((item) => ({
              packageId: item.id,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          lines: true,
          packages: { include: { package: { select: { kind: true, packageNumber: true, quantity: true } } } },
        },
      });
      await tx.materialPackage.updateMany({
        where: { id: { in: uniqueIds }, businessId: requireBusinessId(actor) },
        data: { status: PackageStatus.IN_FACTORY, issuedTo: null },
      });
      return operation;
    });

    return {
      ...this.presentOperation(created),
      movedQuantity: qty(movedQty),
      factory: await this.factory(actor),
    };
  }

  async issueToPerson(actor: Actor, dto: IssueToPersonDto) {
    const membershipIds = [...new Set(dto.lines.map((line) => line.membershipId))];
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

    const lines = dto.lines.map((line) => {
      const quantity = new Prisma.Decimal(line.quantity);
      if (quantity.lte(0)) throw new BadRequestException('Each issue quantity must be greater than zero.');
      return {
        membershipId: line.membershipId,
        personName: workerName.get(line.membershipId)!,
        materialForm: line.materialForm,
        quantity,
      };
    });

    const businessId = requireBusinessId(actor);
    const packageIds = [...new Set(dto.packageIds ?? [])];
    const needed = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const line of lines) {
      needed.set(line.materialForm, (needed.get(line.materialForm) ?? new Prisma.Decimal(0)).plus(line.quantity));
    }

    let takes: IssueTake[] = [];
    if (packageIds.length) {
      const packages = await this.prisma.materialPackage.findMany({
        where: { businessId, id: { in: packageIds } },
        include: { receipt: { select: { materialForm: true } } },
        orderBy: [{ packageNumber: 'asc' }],
      });
      if (packages.length !== packageIds.length) {
        throw new NotFoundException('One or more bags or drums were not found in this business.');
      }
      for (const item of packages) {
        if (item.status !== PackageStatus.IN_FACTORY && item.status !== PackageStatus.IN_STORE) {
          throw new BadRequestException(`Bag or drum ${item.packageNumber} is already issued.`);
        }
      }
      takes = this.allocateTakesFromBags(
        packages.map((item) => ({
          id: item.id,
          packageNumber: item.packageNumber,
          quantity: item.quantity,
          status: item.status,
          materialForm: item.receipt.materialForm,
        })),
        needed,
      );
    } else {
      // Quantity-only issue: FIFO bags, full bags first, last bag may be partial.
      takes = await this.pickFactoryBagsForIssue(businessId, needed);
    }

    const balances = await this.factoryBalances(businessId);
    const balanceMap = new Map(balances.map((row) => [row.materialForm, row.available]));
    const fromStorePkg = takes.filter((item) => item.status === PackageStatus.IN_STORE);

    for (const [materialForm, quantity] of needed.entries()) {
      const available = balanceMap.get(materialForm) ?? new Prisma.Decimal(0);
      const storeCover = fromStorePkg
        .filter((item) => item.materialForm === materialForm)
        .reduce((sum, item) => sum.plus(item.takeQuantity), new Prisma.Decimal(0));
      const room = available.plus(storeCover);
      if (quantity.gt(room)) {
        throw new BadRequestException(
          `Not enough ${LABELS[materialForm]} available. Factory has ${qty(available)}${storeCover.gt(0) ? ` and selected store bags add ${qty(storeCover)}` : ''}, but issuing ${qty(quantity)}. Transfer from store first, or select store bags.`,
        );
      }
    }

    const personLabel =
      lines.length === 1 ? lines[0].personName : [...new Set(lines.map((line) => line.personName))].join(', ');

    const created = await this.prisma.$transaction(async (tx) => {
      const reference = await this.nextReference(tx, businessId, 'issue', 'ISS');
      const operation = await tx.stockOperation.create({
        data: {
          businessId,
          reference,
          date: dto.date,
          type: StockOpType.ISSUE_TO_PERSON,
          notes: dto.notes?.trim() || null,
          lines: {
            create: lines.map((line) => ({
              membershipId: line.membershipId,
              personName: line.personName,
              materialForm: line.materialForm,
              quantity: line.quantity,
            })),
          },
          packages: takes.length
            ? {
                create: takes.map((item) => ({
                  packageId: item.id,
                  quantity: item.takeQuantity,
                })),
              }
            : undefined,
        },
        include: {
          lines: true,
          packages: { include: { package: { select: { kind: true, packageNumber: true, quantity: true } } } },
        },
      });

      for (const take of takes) {
        if (take.partial) {
          await tx.materialPackage.update({
            where: { id: take.id },
            data: {
              quantity: take.bagQuantity.minus(take.takeQuantity),
              status: PackageStatus.IN_FACTORY,
              issuedTo: null,
            },
          });
        } else {
          await tx.materialPackage.update({
            where: { id: take.id },
            data: { status: PackageStatus.ISSUED, issuedTo: personLabel },
          });
        }
      }

      return operation;
    });

    return {
      ...this.presentOperation(created),
      factory: await this.factory(actor),
    };
  }

  /** Pick IN_FACTORY bags FIFO; take full bags then a partial from the last bag if needed. */
  private async pickFactoryBagsForIssue(
    businessId: string,
    needed: Map<IncomingMaterial, Prisma.Decimal>,
  ) {
    const candidates = await this.prisma.materialPackage.findMany({
      where: {
        businessId,
        status: PackageStatus.IN_FACTORY,
        receipt: { materialForm: { in: [...needed.keys()] } },
      },
      include: { receipt: { select: { materialForm: true } } },
      orderBy: [{ packageNumber: 'asc' }],
    });

    return this.allocateTakesFromBags(
      candidates.map((bag) => ({
        id: bag.id,
        packageNumber: bag.packageNumber,
        quantity: bag.quantity,
        status: bag.status,
        materialForm: bag.receipt.materialForm,
      })),
      needed,
    );
  }

  private allocateTakesFromBags(
    bags: Array<{
      id: string;
      packageNumber: string;
      quantity: Prisma.Decimal;
      status: PackageStatus;
      materialForm: IncomingMaterial;
    }>,
    needed: Map<IncomingMaterial, Prisma.Decimal>,
  ): IssueTake[] {
    const remaining = new Map(needed);
    const takes: IssueTake[] = [];

    for (const bag of bags) {
      const stillNeed = remaining.get(bag.materialForm) ?? new Prisma.Decimal(0);
      if (stillNeed.lte(0)) continue;
      const takeQuantity = Prisma.Decimal.min(stillNeed, bag.quantity);
      if (takeQuantity.lte(0)) continue;
      takes.push({
        id: bag.id,
        packageNumber: bag.packageNumber,
        bagQuantity: bag.quantity,
        takeQuantity,
        status: bag.status,
        materialForm: bag.materialForm,
        partial: takeQuantity.lt(bag.quantity),
      });
      remaining.set(bag.materialForm, stillNeed.minus(takeQuantity));
    }

    return takes;
  }

  /**
   * Link quantity-only issues to bags (with partial takes), and shrink older links
   * that over-consumed whole bags when only part was needed.
   */
  private async reconcileIssuePackages(businessId: string) {
    await this.linkUnallocatedIssues(businessId);
    await this.repairOverAllocatedIssues(businessId);
  }

  private async linkUnallocatedIssues(businessId: string) {
    const orphans = await this.prisma.stockOperation.findMany({
      where: {
        businessId,
        type: StockOpType.ISSUE_TO_PERSON,
        packages: { none: {} },
      },
      include: { lines: true },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    if (!orphans.length) return;

    for (const operation of orphans) {
      const needed = new Map<IncomingMaterial, Prisma.Decimal>();
      for (const line of operation.lines) {
        needed.set(line.materialForm, (needed.get(line.materialForm) ?? new Prisma.Decimal(0)).plus(line.quantity));
      }
      const takes = await this.pickFactoryBagsForIssue(businessId, needed);
      if (!takes.length) continue;

      const personLabel = [...new Set(operation.lines.map((line) => line.personName))].join(', ');
      await this.prisma.$transaction(async (tx) => {
        await tx.stockOperationPackage.createMany({
          data: takes.map((take) => ({
            operationId: operation.id,
            packageId: take.id,
            quantity: take.takeQuantity,
          })),
        });
        for (const take of takes) {
          if (take.partial) {
            await tx.materialPackage.update({
              where: { id: take.id },
              data: {
                quantity: take.bagQuantity.minus(take.takeQuantity),
                status: PackageStatus.IN_FACTORY,
                issuedTo: null,
              },
            });
          } else {
            await tx.materialPackage.update({
              where: { id: take.id },
              data: { status: PackageStatus.ISSUED, issuedTo: personLabel },
            });
          }
        }
      });
    }
  }

  /** Fix issues where whole bags were linked but only part of the last bag was needed. */
  private async repairOverAllocatedIssues(businessId: string) {
    const operations = await this.prisma.stockOperation.findMany({
      where: {
        businessId,
        type: StockOpType.ISSUE_TO_PERSON,
        packages: { some: {} },
      },
      include: {
        lines: true,
        packages: {
          include: {
            package: {
              select: {
                id: true,
                quantity: true,
                status: true,
                packageNumber: true,
                receipt: { select: { materialForm: true } },
              },
            },
          },
          orderBy: { package: { packageNumber: 'asc' } },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    for (const operation of operations) {
      const issuedByForm = new Map<IncomingMaterial, Prisma.Decimal>();
      for (const line of operation.lines) {
        issuedByForm.set(
          line.materialForm,
          (issuedByForm.get(line.materialForm) ?? new Prisma.Decimal(0)).plus(line.quantity),
        );
      }

      const linkedByForm = new Map<IncomingMaterial, Prisma.Decimal>();
      for (const link of operation.packages) {
        const form = link.package.receipt.materialForm;
        linkedByForm.set(form, (linkedByForm.get(form) ?? new Prisma.Decimal(0)).plus(link.quantity));
      }

      for (const [materialForm, issuedQty] of issuedByForm.entries()) {
        const linkedQty = linkedByForm.get(materialForm) ?? new Prisma.Decimal(0);
        let excess = linkedQty.minus(issuedQty);
        if (excess.lte(0)) continue;

        const links = [...operation.packages]
          .filter((link) => link.package.receipt.materialForm === materialForm)
          .reverse();

        for (const link of links) {
          if (excess.lte(0)) break;
          const shrink = Prisma.Decimal.min(link.quantity, excess);
          const newLinkQty = link.quantity.minus(shrink);

          if (newLinkQty.lte(0)) {
            await this.prisma.$transaction(async (tx) => {
              await tx.stockOperationPackage.delete({ where: { id: link.id } });
              await tx.materialPackage.update({
                where: { id: link.packageId },
                data: { status: PackageStatus.IN_FACTORY, issuedTo: null },
              });
            });
          } else {
            // Partial take on this bag: keep remainder at factory.
            const bag = link.package;
            const remainder =
              bag.status === PackageStatus.ISSUED
                ? bag.quantity.minus(newLinkQty)
                : bag.quantity.plus(shrink);

            await this.prisma.$transaction(async (tx) => {
              await tx.stockOperationPackage.update({
                where: { id: link.id },
                data: { quantity: newLinkQty },
              });
              await tx.materialPackage.update({
                where: { id: link.packageId },
                data: {
                  quantity: remainder,
                  status: PackageStatus.IN_FACTORY,
                  issuedTo: null,
                },
              });
            });
          }

          excess = excess.minus(shrink);
        }
      }
    }
  }

  private async factoryBalances(businessId: string) {
    const materials = [IncomingMaterial.RODA, IncomingMaterial.EIGHTEEN_UP, IncomingMaterial.QUALITY];
    const [factoryReceipts, inFactoryPackages, transferLinks, issuedLines] = await Promise.all([
      this.prisma.materialReceipt.groupBy({
        by: ['materialForm'],
        where: { businessId, destination: 'FACTORY' },
        _sum: { quantity: true },
      }),
      this.prisma.materialPackage.findMany({
        where: { businessId, status: PackageStatus.IN_FACTORY },
        select: { quantity: true, receipt: { select: { materialForm: true } } },
      }),
      // Immutable transfer quantities (partial bag take must not shrink "In").
      this.prisma.stockOperationPackage.findMany({
        where: { operation: { businessId, type: StockOpType.STORE_TO_FACTORY } },
        select: {
          quantity: true,
          package: { select: { receipt: { select: { materialForm: true } } } },
        },
      }),
      this.prisma.stockOperationLine.findMany({
        where: { operation: { businessId, type: StockOpType.ISSUE_TO_PERSON } },
        select: { materialForm: true, quantity: true },
      }),
    ]);

    const transferredIn = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const item of transferLinks) {
      const form = item.package.receipt.materialForm;
      transferredIn.set(form, (transferredIn.get(form) ?? new Prisma.Decimal(0)).plus(item.quantity));
    }

    const inFactory = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const item of inFactoryPackages) {
      inFactory.set(
        item.receipt.materialForm,
        (inFactory.get(item.receipt.materialForm) ?? new Prisma.Decimal(0)).plus(item.quantity),
      );
    }

    const boughtAtFactory = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const row of factoryReceipts) {
      boughtAtFactory.set(row.materialForm, row._sum.quantity ?? new Prisma.Decimal(0));
    }

    const issued = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const line of issuedLines) {
      issued.set(line.materialForm, (issued.get(line.materialForm) ?? new Prisma.Decimal(0)).plus(line.quantity));
    }

    return materials.map((materialForm) => {
      const bought = boughtAtFactory.get(materialForm) ?? new Prisma.Decimal(0);
      const transferred = transferredIn.get(materialForm) ?? new Prisma.Decimal(0);
      const issuedQty = issued.get(materialForm) ?? new Prisma.Decimal(0);
      const available = bought.plus(transferred).minus(issuedQty);
      return {
        materialForm,
        boughtAtFactory: bought,
        transferredIn: transferred,
        inFactoryPackages: inFactory.get(materialForm) ?? new Prisma.Decimal(0),
        issued: issuedQty,
        available: available.lt(0) ? new Prisma.Decimal(0) : available,
      };
    });
  }

  private presentOperation(op: {
    id: string;
    reference: string;
    date: string;
    type: StockOpType;
    notes: string | null;
    lines: Array<{ personName: string; materialForm: IncomingMaterial; quantity: Prisma.Decimal }>;
    packages: Array<{
      quantity: Prisma.Decimal;
      package: { kind: string; packageNumber: string; quantity: Prisma.Decimal };
    }>;
  }) {
    return {
      id: op.id,
      reference: op.reference,
      date: op.date,
      type: op.type,
      notes: op.notes,
      lines: op.lines.map((line) => ({
        personName: line.personName,
        material: LABELS[line.materialForm],
        materialForm: line.materialForm,
        quantity: qty(line.quantity),
      })),
      packages: op.packages.map((item) => ({
        kind: item.package.kind,
        packageNumber: item.package.packageNumber,
        quantity: qty(item.quantity),
      })),
    };
  }

  private heldWithPeople(
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
      string,
      { membershipId: string | null; personName: string; materials: Map<IncomingMaterial, Prisma.Decimal> }
    >();

    const touch = (membershipId: string | null, personName: string) => {
      const key = membershipId ?? personName;
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
