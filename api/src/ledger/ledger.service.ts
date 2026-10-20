import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreditInstrument, LedgerPaymentDirection, PaymentMode, Prisma } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLedgerPaymentDto } from './dto';

type RawEntry = {
  id: string;
  date: string;
  createdAt: Date;
  reference: string;
  type: 'SALE' | 'PURCHASE' | 'PAYMENT';
  particulars: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  currency: string;
};

function money(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(2);
}

function sideOf(balance: Prisma.Decimal): 'DR' | 'CR' | 'NIL' {
  if (balance.isZero()) return 'NIL';
  return balance.gt(0) ? 'DR' : 'CR';
}

function displayBalance(balance: Prisma.Decimal) {
  return money(balance.abs());
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(actor: Actor) {
    const partners = await this.prisma.partner.findMany({
      where: { businessId: requireBusinessId(actor) },
      orderBy: { name: 'asc' },
    });

    const rows = await Promise.all(
      partners.map(async (partner) => {
        const entries = await this.buildEntries(requireBusinessId(actor), partner.id);
        const balance = entries.reduce(
          (sum, entry) => sum.plus(entry.debit).minus(entry.credit),
          new Prisma.Decimal(0),
        );
        const currency = entries[0]?.currency ?? partner.currency ?? 'PKR';
        return {
          partnerId: partner.id,
          partner: partner.name,
          roles: partner.roles,
          currency,
          receivable: balance.gt(0) ? money(balance) : '0.00',
          payable: balance.lt(0) ? money(balance.abs()) : '0.00',
          balance: displayBalance(balance),
          balanceSide: sideOf(balance),
          entries: entries.length,
        };
      }),
    );

    return rows.filter((row) => row.entries > 0 || row.balanceSide !== 'NIL');
  }

  async account(actor: Actor, partnerId: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, businessId: requireBusinessId(actor) },
    });
    if (!partner) throw new NotFoundException('Partner not found.');

    const raw = await this.buildEntries(requireBusinessId(actor), partner.id);
    let running = new Prisma.Decimal(0);
    const entries = raw.map((entry) => {
      running = running.plus(entry.debit).minus(entry.credit);
      return {
        id: entry.id,
        date: entry.date,
        reference: entry.reference,
        type: entry.type,
        particulars: entry.particulars,
        debit: entry.debit.isZero() ? null : money(entry.debit),
        credit: entry.credit.isZero() ? null : money(entry.credit),
        balance: displayBalance(running),
        balanceSide: sideOf(running),
      };
    });

    const balance = running;
    const currency = raw[0]?.currency ?? partner.currency ?? 'PKR';
    return {
      partnerId: partner.id,
      partner: partner.name,
      roles: partner.roles,
      currency,
      receivable: balance.gt(0) ? money(balance) : '0.00',
      payable: balance.lt(0) ? money(balance.abs()) : '0.00',
      balance: displayBalance(balance),
      balanceSide: sideOf(balance),
      entries,
    };
  }

  async createPayment(actor: Actor, dto: CreateLedgerPaymentDto) {
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Amount must be greater than zero.');

    const partner = await this.prisma.partner.findFirst({
      where: { id: dto.partnerId, businessId: requireBusinessId(actor), active: true },
    });
    if (!partner) throw new NotFoundException('Choose an active partner.');

    const method = dto.method ?? CreditInstrument.NONE;
    if (method === CreditInstrument.CHEQUE) {
      if (!dto.chequeNumber?.trim() || !dto.bankName?.trim()) {
        throw new BadRequestException('For a cheque, enter the cheque number and bank.');
      }
    }
    if (method === CreditInstrument.OTHER && !dto.instrumentNote?.trim()) {
      throw new BadRequestException('Describe the payment instrument.');
    }

    const currency = partner.currency ?? 'PKR';
    const created = await this.prisma.$transaction(async (tx) => {
      const reference = await this.nextReference(tx, requireBusinessId(actor));
      return tx.ledgerPayment.create({
        data: {
          businessId: requireBusinessId(actor),
          partnerId: partner.id,
          reference,
          date: dto.date,
          direction: dto.direction,
          amount,
          currency,
          method,
          cashPaidTo: method === CreditInstrument.NONE ? dto.cashPaidTo?.trim() || null : null,
          chequeNumber: method === CreditInstrument.CHEQUE ? dto.chequeNumber!.trim() : null,
          bankName: method === CreditInstrument.CHEQUE ? dto.bankName!.trim() : null,
          instrumentNote: method === CreditInstrument.OTHER ? dto.instrumentNote!.trim() : null,
          notes: dto.notes?.trim() || null,
        },
      });
    });

    return {
      id: created.id,
      reference: created.reference,
      date: created.date,
      partnerId: partner.id,
      partner: partner.name,
      direction: created.direction,
      amount: money(created.amount),
      currency: created.currency,
      method: created.method,
      cashPaidTo: created.cashPaidTo,
      chequeNumber: created.chequeNumber,
      bankName: created.bankName,
      instrumentNote: created.instrumentNote,
      notes: created.notes,
    };
  }

  private async buildEntries(businessId: string, partnerId: string): Promise<RawEntry[]> {
    const [sales, receipts, payments] = await Promise.all([
      this.prisma.sale.findMany({
        where: { businessId, partnerId },
        include: { lines: true },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.materialReceipt.findMany({
        where: { businessId, partnerId },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.ledgerPayment.findMany({
        where: { businessId, partnerId },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const entries: RawEntry[] = [];

    for (const sale of sales) {
      const amount = sale.lines.reduce((sum, line) => {
        if (!line.rate) return sum;
        return sum.plus(line.quantity.mul(line.rate));
      }, new Prisma.Decimal(0));
      if (amount.isZero()) continue;

      const qualities = sale.lines.map((line) => line.qualityText).join(', ');
      const salePay =
        sale.paymentMode === PaymentMode.CREDIT
          ? sale.instrumentNote
            ? `on credit · ${sale.instrumentNote}`
            : 'on credit'
          : sale.cashPaidTo
            ? `cash · ${sale.cashPaidTo}`
            : 'cash';
      entries.push({
        id: `sale-${sale.id}`,
        date: sale.date,
        createdAt: sale.createdAt,
        reference: sale.reference,
        type: 'SALE',
        particulars: `Sale · ${qualities || 'Finished goods'} · ${salePay}`,
        debit: amount,
        credit: new Prisma.Decimal(0),
        currency: sale.currency,
      });

      if (sale.paymentMode === PaymentMode.CASH) {
        entries.push({
          id: `sale-cash-${sale.id}`,
          date: sale.date,
          createdAt: sale.createdAt,
          reference: sale.reference,
          type: 'PAYMENT',
          particulars: sale.cashPaidTo ? `Cash received by ${sale.cashPaidTo}` : 'Cash received',
          debit: new Prisma.Decimal(0),
          credit: amount,
          currency: sale.currency,
        });
      }
    }

    for (const receipt of receipts) {
      const amount = receipt.rate ? receipt.quantity.mul(receipt.rate) : new Prisma.Decimal(0);
      const qtyLabel = receipt.quantity.toFixed(3).replace(/\.?0+$/, '') || '0';
      const hasAmount = Boolean(receipt.rate) && !amount.isZero();
      const payLabel =
        receipt.paymentMode === PaymentMode.CREDIT
          ? 'on credit'
          : receipt.cashPaidTo
            ? `cash · ${receipt.cashPaidTo}`
            : 'cash';

      entries.push({
        id: `buy-${receipt.id}`,
        date: receipt.date,
        createdAt: receipt.createdAt,
        reference: receipt.reference,
        type: 'PURCHASE',
        particulars: hasAmount
          ? `Purchase · ${receipt.qualityText} · ${qtyLabel} · ${payLabel}`
          : `Purchase · ${receipt.qualityText} · ${qtyLabel} · rate not set (no amount)`,
        debit: new Prisma.Decimal(0),
        credit: hasAmount ? amount : new Prisma.Decimal(0),
        currency: receipt.currency,
      });

      if (hasAmount && receipt.paymentMode === PaymentMode.CASH) {
        entries.push({
          id: `buy-cash-${receipt.id}`,
          date: receipt.date,
          createdAt: receipt.createdAt,
          reference: receipt.reference,
          type: 'PAYMENT',
          particulars: receipt.cashPaidTo ? `Cash paid to ${receipt.cashPaidTo}` : 'Cash paid',
          debit: amount,
          credit: new Prisma.Decimal(0),
          currency: receipt.currency,
        });
      }
    }

    for (const payment of payments) {
      const isReceived = payment.direction === LedgerPaymentDirection.RECEIVED;
      let particulars = isReceived ? 'Payment received' : 'Payment paid';
      if (payment.method === CreditInstrument.CHEQUE) {
        particulars = `${particulars} · Cheque ${payment.chequeNumber ?? ''}${payment.bankName ? ` · ${payment.bankName}` : ''}`.trim();
      } else if (payment.method === CreditInstrument.OTHER) {
        particulars = `${particulars} · ${payment.instrumentNote ?? 'Instrument'}`;
      } else if (payment.cashPaidTo) {
        particulars = `${particulars} · ${payment.cashPaidTo}`;
      }
      if (payment.notes) particulars = `${particulars} · ${payment.notes}`;

      entries.push({
        id: `pay-${payment.id}`,
        date: payment.date,
        createdAt: payment.createdAt,
        reference: payment.reference,
        type: 'PAYMENT',
        particulars,
        debit: isReceived ? new Prisma.Decimal(0) : payment.amount,
        credit: isReceived ? payment.amount : new Prisma.Decimal(0),
        currency: payment.currency,
      });
    }

    entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const time = a.createdAt.getTime() - b.createdAt.getTime();
      if (time !== 0) return time;
      return a.reference.localeCompare(b.reference) || a.id.localeCompare(b.id);
    });

    return entries;
  }

  private async nextReference(tx: Prisma.TransactionClient, businessId: string) {
    const current = await tx.sequence.upsert({
      where: { businessId_key: { businessId, key: 'ledger_payment' } },
      update: { value: { increment: 1 } },
      create: { businessId, key: 'ledger_payment', value: 1 },
    });
    return `PAY-${String(current.value).padStart(4, '0')}`;
  }
}
