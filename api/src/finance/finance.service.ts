import { BadRequestException, Injectable } from '@nestjs/common';
import { IncomingMaterial, LedgerPaymentDirection, PackageStatus, PaymentMode, Prisma, StockOpType } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceQueryDto } from './dto';

const LABELS: Record<IncomingMaterial, string> = {
  RODA: 'Roda',
  EIGHTEEN_UP: '18/UP',
  QUALITY: 'Quality',
};

const MATERIALS = [IncomingMaterial.RODA, IncomingMaterial.EIGHTEEN_UP, IncomingMaterial.QUALITY];

function money(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(2);
}

function qty(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(3).replace(/\.?0+$/, '') || '0';
}

function inRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function saleAmount(lines: Array<{ quantity: Prisma.Decimal; rate: Prisma.Decimal | null }>) {
  return lines.reduce((sum, line) => {
    if (!line.rate) return sum;
    return sum.plus(line.quantity.mul(line.rate));
  }, new Prisma.Decimal(0));
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(actor: Actor, query: FinanceQueryDto) {
    const from = query.from?.trim() || undefined;
    const to = query.to?.trim() || undefined;
    if (from && to && from > to) {
      throw new BadRequestException('From date must be on or before To date.');
    }

    const businessId = requireBusinessId(actor);
    const [business, sales, receipts, payments, expenseLines, inventory] = await Promise.all([
      this.prisma.business.findUnique({ where: { id: businessId }, select: { currency: true } }),
      this.prisma.sale.findMany({
        where: { businessId },
        include: { lines: true },
      }),
      this.prisma.materialReceipt.findMany({ where: { businessId } }),
      this.prisma.ledgerPayment.findMany({ where: { businessId } }),
      this.prisma.dailyExpense.findMany({ where: { businessId } }),
      this.inventoryPosition(businessId),
    ]);

    const currency = business?.currency ?? 'PKR';

    let receivable = new Prisma.Decimal(0);
    let payable = new Prisma.Decimal(0);
    const partnerIds = new Set<string>();
    for (const sale of sales) partnerIds.add(sale.partnerId);
    for (const receipt of receipts) partnerIds.add(receipt.partnerId);
    for (const payment of payments) partnerIds.add(payment.partnerId);

    for (const partnerId of partnerIds) {
      let balance = new Prisma.Decimal(0);

      for (const sale of sales.filter((item) => item.partnerId === partnerId)) {
        const amount = saleAmount(sale.lines);
        if (amount.isZero()) continue;
        balance = balance.plus(amount);
        if (sale.paymentMode === PaymentMode.CASH) balance = balance.minus(amount);
      }

      for (const receipt of receipts.filter((item) => item.partnerId === partnerId)) {
        if (!receipt.rate) continue;
        const amount = receipt.quantity.mul(receipt.rate);
        if (amount.isZero()) continue;
        balance = balance.minus(amount);
        if (receipt.paymentMode === PaymentMode.CASH) balance = balance.plus(amount);
      }

      for (const payment of payments.filter((item) => item.partnerId === partnerId)) {
        if (payment.direction === LedgerPaymentDirection.RECEIVED) {
          balance = balance.minus(payment.amount);
        } else {
          balance = balance.plus(payment.amount);
        }
      }

      if (balance.gt(0)) receivable = receivable.plus(balance);
      if (balance.lt(0)) payable = payable.plus(balance.abs());
    }

    let salesRevenue = new Prisma.Decimal(0);
    let cashSales = new Prisma.Decimal(0);
    let purchaseCost = new Prisma.Decimal(0);
    let cashPurchases = new Prisma.Decimal(0);
    let expenses = new Prisma.Decimal(0);
    let paymentsReceived = new Prisma.Decimal(0);
    let paymentsPaid = new Prisma.Decimal(0);
    let soldInPeriod = new Prisma.Decimal(0);

    for (const sale of sales) {
      if (!inRange(sale.date, from, to)) continue;
      const amount = saleAmount(sale.lines);
      if (amount.isZero()) continue;
      salesRevenue = salesRevenue.plus(amount);
      if (sale.paymentMode === PaymentMode.CASH) cashSales = cashSales.plus(amount);
      for (const line of sale.lines) soldInPeriod = soldInPeriod.plus(line.quantity);
    }

    for (const receipt of receipts) {
      if (!inRange(receipt.date, from, to)) continue;
      if (!receipt.rate) continue;
      const amount = receipt.quantity.mul(receipt.rate);
      if (amount.isZero()) continue;
      purchaseCost = purchaseCost.plus(amount);
      if (receipt.paymentMode === PaymentMode.CASH) cashPurchases = cashPurchases.plus(amount);
    }

    for (const line of expenseLines) {
      if (!inRange(line.date, from, to)) continue;
      expenses = expenses.plus(line.amount);
    }

    for (const payment of payments) {
      if (!inRange(payment.date, from, to)) continue;
      if (payment.direction === LedgerPaymentDirection.RECEIVED) {
        paymentsReceived = paymentsReceived.plus(payment.amount);
      } else {
        paymentsPaid = paymentsPaid.plus(payment.amount);
      }
    }

    // Period COGS from finished-goods unit cost (material issued into production)
    const cogs = inventory.unitCost.mul(soldInPeriod);
    const moneyIn = cashSales.plus(paymentsReceived);
    const moneyOut = cashPurchases.plus(expenses).plus(paymentsPaid);
    const netCash = moneyIn.minus(moneyOut);
    const grossProfit = salesRevenue.minus(cogs);
    const netProfit = grossProfit.minus(expenses);
    const inventoryTotal = inventory.rawValue.plus(inventory.finishedValue);
    const netPosition = receivable.plus(inventoryTotal).minus(payable);

    return {
      currency,
      from: from ?? null,
      to: to ?? null,
      receivable: money(receivable),
      payable: money(payable),
      inventoryRaw: money(inventory.rawValue),
      inventoryFinished: money(inventory.finishedValue),
      inventoryTotal: money(inventoryTotal),
      netPosition: money(netPosition),
      moneyIn: money(moneyIn),
      moneyOut: money(moneyOut),
      netCash: money(netCash),
      salesRevenue: money(salesRevenue),
      purchaseCost: money(purchaseCost),
      cogs: money(cogs),
      expenses: money(expenses),
      grossProfit: money(grossProfit),
      netProfit: money(netProfit),
      assetBreakdown: [
        { label: 'Receivable', amount: money(receivable), detail: 'Customers owe you' },
        { label: 'Stock (raw)', amount: money(inventory.rawValue), detail: 'Material still on hand at buy rate' },
        {
          label: 'Stock (finished)',
          amount: money(inventory.finishedValue),
          detail: `${qty(inventory.finishedQty)} hanks available`,
        },
        { label: 'Payable', amount: money(payable), detail: 'You owe suppliers' },
        { label: 'Net position', amount: money(netPosition), detail: 'Assets − payable' },
      ],
      inventoryBreakdown: inventory.lines,
      moneyInBreakdown: [
        { label: 'Cash sales', amount: money(cashSales) },
        { label: 'Payments received', amount: money(paymentsReceived) },
      ],
      moneyOutBreakdown: [
        { label: 'Cash purchases', amount: money(cashPurchases) },
        { label: 'Expenses', amount: money(expenses) },
        { label: 'Payments to suppliers', amount: money(paymentsPaid) },
      ],
      profitBreakdown: [
        { label: 'Sales revenue', amount: money(salesRevenue) },
        {
          label: 'Cost of goods sold',
          amount: money(cogs),
          detail: 'Cost of hanks sold (stock left stays as asset)',
        },
        { label: 'Purchases in period', amount: money(purchaseCost), detail: 'For reference — not all is expense' },
        { label: 'Gross profit', amount: money(grossProfit) },
        { label: 'Expenses', amount: money(expenses) },
        { label: 'Net profit', amount: money(netProfit) },
      ],
    };
  }

  /**
   * Raw stock at weighted-average buy rate.
   * Finished stock / COGS unit cost from material issued to people (proxy for production input).
   */
  private async inventoryPosition(businessId: string) {
    const [receipts, storePackages, factoryReceipts, transferredPackages, issuedLines, productionOutputs, soldLines] =
      await Promise.all([
        this.prisma.materialReceipt.findMany({
          where: { businessId },
          select: { materialForm: true, quantity: true, rate: true },
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
          select: { quantity: true },
        }),
        this.prisma.saleLine.findMany({
          where: { sale: { businessId } },
          select: { quantity: true },
        }),
      ]);

    const boughtValue = new Map<IncomingMaterial, Prisma.Decimal>();
    const boughtQty = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const receipt of receipts) {
      if (!receipt.rate) continue;
      boughtQty.set(receipt.materialForm, (boughtQty.get(receipt.materialForm) ?? new Prisma.Decimal(0)).plus(receipt.quantity));
      boughtValue.set(
        receipt.materialForm,
        (boughtValue.get(receipt.materialForm) ?? new Prisma.Decimal(0)).plus(receipt.quantity.mul(receipt.rate)),
      );
    }

    const avgRate = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const form of MATERIALS) {
      const q = boughtQty.get(form) ?? new Prisma.Decimal(0);
      const v = boughtValue.get(form) ?? new Prisma.Decimal(0);
      avgRate.set(form, q.gt(0) ? v.div(q) : new Prisma.Decimal(0));
    }

    const storeQty = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const item of storePackages) {
      storeQty.set(
        item.receipt.materialForm,
        (storeQty.get(item.receipt.materialForm) ?? new Prisma.Decimal(0)).plus(item.quantity),
      );
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

    const issuedQty = new Map<IncomingMaterial, Prisma.Decimal>();
    for (const line of issuedLines) {
      issuedQty.set(line.materialForm, (issuedQty.get(line.materialForm) ?? new Prisma.Decimal(0)).plus(line.quantity));
    }

    // Unissued raw (store + factory floor) stays as raw asset.
    // Issued-to-workers value becomes the cost pool for finished hanks / COGS.
    let rawValue = new Prisma.Decimal(0);
    let issuedValue = new Prisma.Decimal(0);
    const lines: Array<{ label: string; amount: string; detail?: string }> = [];

    for (const form of MATERIALS) {
      const store = storeQty.get(form) ?? new Prisma.Decimal(0);
      const factoryBought = boughtAtFactory.get(form) ?? new Prisma.Decimal(0);
      const transferred = transferredIn.get(form) ?? new Prisma.Decimal(0);
      const issued = issuedQty.get(form) ?? new Prisma.Decimal(0);
      const factoryFloor = factoryBought.plus(transferred).minus(issued);
      const floor = factoryFloor.lt(0) ? new Prisma.Decimal(0) : factoryFloor;
      const unissued = store.plus(floor);
      const rate = avgRate.get(form) ?? new Prisma.Decimal(0);
      const value = unissued.mul(rate);
      const issuedPart = issued.mul(rate);
      rawValue = rawValue.plus(value);
      issuedValue = issuedValue.plus(issuedPart);
      if (unissued.gt(0) || issued.gt(0)) {
        lines.push({
          label: LABELS[form],
          amount: money(value),
          detail: `${qty(unissued)} in store/factory @ avg ${money(rate)}${
            issued.gt(0) ? ` · ${qty(issued)} issued to workers (in finished cost)` : ''
          }`,
        });
      }
    }

    const produced = productionOutputs.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0));
    const sold = soldLines.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0));
    const finishedQty = produced.minus(sold);
    const availableFinished = finishedQty.lt(0) ? new Prisma.Decimal(0) : finishedQty;

    const unitCost = produced.gt(0) ? issuedValue.div(produced) : new Prisma.Decimal(0);
    const finishedValue = availableFinished.mul(unitCost);
    // Issued but not yet reflected in produced output remains WIP asset
    const absorbed = unitCost.mul(produced);
    const wipValue = issuedValue.minus(absorbed);
    const wip = wipValue.gt(0) ? wipValue : new Prisma.Decimal(0);
    rawValue = rawValue.plus(wip);

    if (wip.gt(0)) {
      lines.push({
        label: 'Work in process',
        amount: money(wip),
        detail: 'Issued to workers, not yet in recorded production',
      });
    }

    if (availableFinished.gt(0) || sold.gt(0)) {
      lines.push({
        label: 'Finished hanks',
        amount: money(finishedValue),
        detail: `${qty(availableFinished)} available · ${qty(sold)} sold · unit cost ${money(unitCost)}`,
      });
    }

    return {
      rawValue,
      finishedValue,
      finishedQty: availableFinished,
      unitCost,
      lines,
    };
  }
}
