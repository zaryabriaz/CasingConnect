import { Injectable } from '@nestjs/common';
import { IncomingMaterial, PackageStatus, Prisma, StockOpType } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../prisma/prisma.service';

const LABELS: Record<IncomingMaterial, string> = {
  RODA: 'Roda',
  EIGHTEEN_UP: '18/UP',
  QUALITY: 'Quality',
};

const MATERIALS = [IncomingMaterial.RODA, IncomingMaterial.EIGHTEEN_UP, IncomingMaterial.QUALITY];

function qty(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(3).replace(/\.?0+$/, '') || '0';
}

function money(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(2).replace(/\.?0+$/, '') || '0';
}

function todayKarachi() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function materialRows(map: Map<string, Prisma.Decimal>) {
  return MATERIALS.map((form) => ({
    material: LABELS[form],
    materialForm: form,
    quantity: qty(map.get(LABELS[form]) ?? 0),
  })).filter((row) => Number(row.quantity) > 0);
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
  ) {}

  async summary(actor: Actor) {
    const date = todayKarachi();
    const businessId = requireBusinessId(actor);

    const [
      storeReceipts,
      todayReceipts,
      recentReceipts,
      todayExpenses,
      partners,
      storePackages,
      inStorePackages,
      factoryReceipts,
      transferredPackages,
      issuedLines,
      productionOutputs,
      soldLines,
      todayOutputs,
      todaySales,
      recentSales,
      finance,
      business,
    ] = await Promise.all([
      this.prisma.materialReceipt.findMany({
        where: { businessId, destination: 'STORE', packages: { some: { status: PackageStatus.IN_STORE } } },
        include: {
          packages: {
            where: { status: PackageStatus.IN_STORE },
            select: { kind: true, quantity: true },
          },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.materialReceipt.findMany({
        where: { businessId, date },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.materialReceipt.findMany({
        where: { businessId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 6,
      }),
      this.prisma.dailyExpense.findMany({
        where: { businessId, date },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.partner.count({ where: { businessId, active: true } }),
      this.prisma.materialPackage.groupBy({
        by: ['kind'],
        where: { businessId, status: PackageStatus.IN_STORE },
        _count: { _all: true },
      }),
      this.prisma.materialPackage.findMany({
        where: { businessId, status: PackageStatus.IN_STORE },
        select: { quantity: true, receipt: { select: { materialForm: true } } },
      }),
      this.prisma.materialReceipt.groupBy({
        by: ['materialForm'],
        where: { businessId, destination: 'FACTORY' },
        _sum: { quantity: true },
      }),
      this.prisma.materialPackage.findMany({
        where: { businessId, status: { in: [PackageStatus.IN_FACTORY, PackageStatus.ISSUED] } },
        select: {
          quantity: true,
          receipt: { select: { materialForm: true, destination: true } },
        },
      }),
      this.prisma.stockOperationLine.findMany({
        where: { operation: { businessId, type: StockOpType.ISSUE_TO_PERSON } },
        select: { materialForm: true, quantity: true },
      }),
      this.prisma.productionOutputLine.findMany({
        where: { entry: { businessId } },
        select: {
          quantity: true,
          quality: { select: { id: true, name: true, casingType: { select: { name: true } } } },
        },
      }),
      this.prisma.saleLine.groupBy({
        by: ['qualityId'],
        where: { sale: { businessId } },
        _sum: { quantity: true },
      }),
      this.prisma.productionOutputLine.findMany({
        where: { entry: { businessId, date } },
        select: { quantity: true },
      }),
      this.prisma.saleLine.findMany({
        where: { sale: { businessId, date } },
        select: { quantity: true },
      }),
      this.prisma.sale.findMany({
        where: { businessId },
        include: { lines: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 8,
      }),
      this.finance.overview(actor, { to: date }),
      this.prisma.business.findUnique({ where: { id: businessId }, select: { currency: true } }),
    ]);

    const storeByMaterial = new Map<string, Prisma.Decimal>();
    let storeTotal = new Prisma.Decimal(0);
    for (const item of inStorePackages) {
      const label = LABELS[item.receipt.materialForm];
      storeByMaterial.set(label, (storeByMaterial.get(label) ?? new Prisma.Decimal(0)).plus(item.quantity));
      storeTotal = storeTotal.plus(item.quantity);
    }

    const boughtAtFactory = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const row of factoryReceipts) {
      boughtAtFactory.set(row.materialForm, row._sum.quantity ?? new Prisma.Decimal(0));
    }

    const transferredIn = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const item of transferredPackages) {
      if (item.receipt.destination !== 'STORE') continue;
      transferredIn.set(
        item.receipt.materialForm,
        (transferredIn.get(item.receipt.materialForm) ?? new Prisma.Decimal(0)).plus(item.quantity),
      );
    }

    const issued = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const line of issuedLines) {
      issued.set(line.materialForm, (issued.get(line.materialForm) ?? new Prisma.Decimal(0)).plus(line.quantity));
    }

    const factoryByMaterial = new Map<string, Prisma.Decimal>();
    let factoryTotal = new Prisma.Decimal(0);
    for (const form of MATERIALS) {
      const available = (boughtAtFactory.get(form) ?? new Prisma.Decimal(0))
        .plus(transferredIn.get(form) ?? 0)
        .minus(issued.get(form) ?? 0);
      const safe = available.lt(0) ? new Prisma.Decimal(0) : available;
      if (safe.gt(0)) {
        factoryByMaterial.set(LABELS[form], safe);
        factoryTotal = factoryTotal.plus(safe);
      }
    }

    const onHandTotal = storeTotal.plus(factoryTotal);
    const onHandByMaterial = new Map<string, Prisma.Decimal>();
    for (const form of MATERIALS) {
      const label = LABELS[form];
      const combined = (storeByMaterial.get(label) ?? new Prisma.Decimal(0)).plus(
        factoryByMaterial.get(label) ?? new Prisma.Decimal(0),
      );
      if (combined.gt(0)) onHandByMaterial.set(label, combined);
    }

    const boughtTodayByMaterial = new Map<string, Prisma.Decimal>();
    let boughtTodayAmount = new Prisma.Decimal(0);
    for (const receipt of todayReceipts) {
      const label = LABELS[receipt.materialForm];
      boughtTodayByMaterial.set(label, (boughtTodayByMaterial.get(label) ?? new Prisma.Decimal(0)).plus(receipt.quantity));
      if (receipt.rate) boughtTodayAmount = boughtTodayAmount.plus(receipt.quantity.mul(receipt.rate));
    }

    let expenseTotal = new Prisma.Decimal(0);
    let saltBags = new Prisma.Decimal(0);
    for (const line of todayExpenses) {
      expenseTotal = expenseTotal.plus(line.amount);
      if (line.category.toLowerCase() === 'salt' && line.bags) saltBags = saltBags.plus(line.bags);
    }

    const bags = storePackages.find((row) => row.kind === 'BAG')?._count._all ?? 0;
    const drums = storePackages.find((row) => row.kind === 'DRUM')?._count._all ?? 0;

    const hanksByQuality = new Map<
      string,
      { qualityId: string; quality: string; casingType: string; hanks: Prisma.Decimal }
    >();
    let hanksTotal = new Prisma.Decimal(0);
    for (const line of productionOutputs) {
      const key = line.quality.id;
      const row = hanksByQuality.get(key) ?? {
        qualityId: line.quality.id,
        quality: line.quality.name,
        casingType: line.quality.casingType.name,
        hanks: new Prisma.Decimal(0),
      };
      row.hanks = row.hanks.plus(line.quantity);
      hanksByQuality.set(key, row);
      hanksTotal = hanksTotal.plus(line.quantity);
    }

    const soldByQuality = new Map(soldLines.map((row) => [row.qualityId, row._sum.quantity ?? new Prisma.Decimal(0)]));
    let soldTotal = new Prisma.Decimal(0);
    let availableTotal = new Prisma.Decimal(0);
    const hanksQualities = [...hanksByQuality.values()]
      .map((row) => {
        const soldQty = soldByQuality.get(row.qualityId) ?? new Prisma.Decimal(0);
        const availableQty = row.hanks.minus(soldQty);
        const available = availableQty.lt(0) ? new Prisma.Decimal(0) : availableQty;
        soldTotal = soldTotal.plus(soldQty);
        availableTotal = availableTotal.plus(available);
        return {
          qualityId: row.qualityId,
          quality: row.quality,
          casingType: row.casingType,
          hanks: qty(row.hanks),
          sold: qty(soldQty),
          available: qty(available),
        };
      })
      .sort((a, b) => a.casingType.localeCompare(b.casingType) || a.quality.localeCompare(b.quality));

    const hanksToday = todayOutputs.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0));
    const soldToday = todaySales.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0));

    const partnerIds = [
      ...new Set([
        ...recentReceipts.map((item) => item.partnerId),
        ...recentSales.map((item) => item.partnerId),
      ]),
    ];
    const partnerNames = new Map(
      (
        await this.prisma.partner.findMany({
          where: { id: { in: partnerIds } },
          select: { id: true, name: true },
        })
      ).map((partner) => [partner.id, partner.name]),
    );

    const currency = business?.currency ?? finance.currency ?? 'PKR';
    let salesTodayAmount = new Prisma.Decimal(0);
    let salesTodayCount = 0;
    for (const sale of recentSales) {
      if (sale.date !== date) continue;
      salesTodayCount += 1;
      for (const line of sale.lines) {
        if (line.rate) salesTodayAmount = salesTodayAmount.plus(line.quantity.mul(line.rate));
      }
    }

    return {
      date,
      currency,
      onHand: {
        total: qty(onHandTotal),
        store: qty(storeTotal),
        factory: qty(factoryTotal),
        materials: materialRows(onHandByMaterial),
      },
      store: {
        batches: storeReceipts.length,
        bags,
        drums,
        total: qty(storeTotal),
        materials: materialRows(storeByMaterial),
      },
      factory: {
        total: qty(factoryTotal),
        materials: materialRows(factoryByMaterial),
      },
      hanks: {
        total: qty(hanksTotal),
        sold: qty(soldTotal),
        available: qty(availableTotal),
        today: qty(hanksToday),
        soldToday: qty(soldToday),
        qualities: hanksQualities,
      },
      today: {
        purchases: todayReceipts.length,
        purchaseAmount: money(boughtTodayAmount),
        materials: [...boughtTodayByMaterial.entries()].map(([material, quantity]) => ({
          material,
          quantity: qty(quantity),
        })),
        expenses: todayExpenses.length,
        expenseTotal: money(expenseTotal),
        saltBags: saltBags.gt(0) ? qty(saltBags) : '0',
        hanks: qty(hanksToday),
        soldHanks: qty(soldToday),
        sales: salesTodayCount,
        salesAmount: money(salesTodayAmount),
      },
      money: {
        receivable: finance.receivable,
        payable: finance.payable,
        inventoryTotal: finance.inventoryTotal,
        inventoryRaw: finance.inventoryRaw,
        inventoryFinished: finance.inventoryFinished,
        netPosition: finance.netPosition,
        netProfit: finance.netProfit,
        salesRevenue: finance.salesRevenue,
        cogs: finance.cogs,
        moneyIn: finance.moneyIn,
        moneyOut: finance.moneyOut,
      },
      partners,
      recentPurchases: recentReceipts.map((receipt) => ({
        id: receipt.id,
        reference: receipt.reference,
        date: receipt.date,
        material: LABELS[receipt.materialForm],
        quantity: qty(receipt.quantity),
        amount: receipt.rate ? money(receipt.quantity.mul(receipt.rate)) : null,
        supplier: partnerNames.get(receipt.partnerId) ?? 'Supplier',
        destination: receipt.destination,
        paymentMode: receipt.paymentMode,
      })),
      recentSales: recentSales.map((sale) => {
        const amount = sale.lines.reduce((sum, line) => {
          if (!line.rate) return sum;
          return sum.plus(line.quantity.mul(line.rate));
        }, new Prisma.Decimal(0));
        const quantity = sale.lines.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0));
        const hasAmount = sale.lines.some((line) => line.rate);
        return {
          id: sale.id,
          reference: sale.reference,
          date: sale.date,
          customer: partnerNames.get(sale.partnerId) ?? 'Customer',
          quantity: qty(quantity),
          amount: hasAmount ? money(amount) : null,
          paymentMode: sale.paymentMode,
          qualities: sale.lines.map((line) => line.qualityText).join(', '),
        };
      }),
      recentStoreBatches: storeReceipts.slice(0, 6).map((receipt) => {
        const onHand = receipt.packages.reduce((sum, item) => sum.plus(item.quantity), new Prisma.Decimal(0));
        return {
          batch: receipt.reference,
          date: receipt.date,
          material: LABELS[receipt.materialForm],
          quantity: qty(onHand),
          packages: receipt.packages.length,
        };
      }),
    };
  }
}
