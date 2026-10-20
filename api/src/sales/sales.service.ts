import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreditInstrument, PaymentMode, Prisma, SaleChannel } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto';

function qty(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(3).replace(/\.?0+$/, '') || '0';
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: Actor) {
    const sales = await this.prisma.sale.findMany({
      where: { businessId: requireBusinessId(actor) },
      include: { lines: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
    return this.present(requireBusinessId(actor), sales);
  }

  async available(actor: Actor) {
    const [outputs, soldLines, qualities] = await Promise.all([
      this.prisma.productionOutputLine.findMany({
        where: { entry: { businessId: requireBusinessId(actor) } },
        select: {
          quantity: true,
          qualityId: true,
          quality: {
            select: {
              id: true,
              name: true,
              casingTypeId: true,
              casingType: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.saleLine.groupBy({
        by: ['qualityId'],
        where: { sale: { businessId: requireBusinessId(actor) } },
        _sum: { quantity: true },
      }),
      this.prisma.quality.findMany({
        where: { businessId: requireBusinessId(actor), active: true },
        select: {
          id: true,
          name: true,
          casingTypeId: true,
          casingType: { select: { id: true, name: true } },
        },
      }),
    ]);

    const produced = new Map<string, Prisma.Decimal>();
    const meta = new Map<
      string,
      { qualityId: string; quality: string; casingTypeId: string; casingType: string }
    >();

    for (const line of outputs) {
      produced.set(line.qualityId, (produced.get(line.qualityId) ?? new Prisma.Decimal(0)).plus(line.quantity));
      meta.set(line.qualityId, {
        qualityId: line.quality.id,
        quality: line.quality.name,
        casingTypeId: line.quality.casingTypeId,
        casingType: line.quality.casingType.name,
      });
    }

    for (const quality of qualities) {
      if (!meta.has(quality.id)) {
        meta.set(quality.id, {
          qualityId: quality.id,
          quality: quality.name,
          casingTypeId: quality.casingTypeId,
          casingType: quality.casingType.name,
        });
      }
    }

    const sold = new Map(soldLines.map((row) => [row.qualityId, row._sum.quantity ?? new Prisma.Decimal(0)]));

    return [...meta.values()]
      .map((item) => {
        const producedQty = produced.get(item.qualityId) ?? new Prisma.Decimal(0);
        const soldQty = sold.get(item.qualityId) ?? new Prisma.Decimal(0);
        const available = producedQty.minus(soldQty);
        return {
          ...item,
          produced: qty(producedQty),
          sold: qty(soldQty),
          available: qty(available.lt(0) ? 0 : available),
        };
      })
      .filter((row) => Number(row.produced) > 0 || Number(row.sold) > 0)
      .sort((a, b) => a.casingType.localeCompare(b.casingType) || a.quality.localeCompare(b.quality));
  }

  async create(actor: Actor, dto: CreateSaleDto) {
    if (!dto.lines?.length) {
      throw new BadRequestException('Add at least one quality line.');
    }

    const payment = this.checkedPayment(dto);
    const qualityIds = dto.lines.map((line) => line.qualityId);
    if (new Set(qualityIds).size !== qualityIds.length) {
      throw new BadRequestException('Each quality can appear only once on the same sale. Combine quantities on one line.');
    }

    const needed = new Map<string, Prisma.Decimal>();
    const parsedLines = dto.lines.map((line) => {
      const quantity = new Prisma.Decimal(line.quantity);
      if (quantity.lte(0)) throw new BadRequestException('Each line quantity must be greater than zero.');
      const rate = line.rate ? new Prisma.Decimal(line.rate) : null;
      if (rate?.lte(0)) throw new BadRequestException('Rate must be greater than zero.');
      needed.set(line.qualityId, (needed.get(line.qualityId) ?? new Prisma.Decimal(0)).plus(quantity));
      return { ...line, quantity, rate };
    });

    const businessId = requireBusinessId(actor);
    const [partner, unit, availableRows, qualities, business] = await Promise.all([
      this.prisma.partner.findFirst({ where: { id: dto.partnerId, businessId, active: true } }),
      this.numberUnit(businessId),
      this.available(actor),
      this.prisma.quality.findMany({
        where: {
          businessId,
          id: { in: qualityIds },
          active: true,
        },
        include: { casingType: { select: { id: true, name: true, active: true } } },
      }),
      this.prisma.business.findFirst({ where: { id: businessId }, select: { currency: true } }),
    ]);

    if (!partner) throw new NotFoundException('Choose a customer from Partners.');
    if (qualities.length !== qualityIds.length) {
      throw new NotFoundException('One or more qualities were not found in this business.');
    }

    const qualityMap = new Map(qualities.map((item) => [item.id, item]));
    for (const line of parsedLines) {
      const quality = qualityMap.get(line.qualityId);
      if (!quality || !quality.casingType.active || quality.casingTypeId !== line.casingTypeId) {
        throw new BadRequestException(`Quality does not match the selected casing type for ${line.qualityId}.`);
      }
      const availableQty = new Prisma.Decimal(
        availableRows.find((row) => row.qualityId === line.qualityId)?.available ?? 0,
      );
      const want = needed.get(line.qualityId)!;
      if (want.gt(availableQty)) {
        throw new BadRequestException(
          `Not enough ${quality.name} hanks. Available ${qty(availableQty)}, invoice needs ${qty(want)}.`,
        );
      }
    }

    const channel = dto.channel ?? SaleChannel.LOCAL;
    const businessCurrency = business?.currency ?? 'PKR';
    const currency = (dto.currency?.trim().toUpperCase() ||
      (channel === SaleChannel.EXPORT ? 'USD' : businessCurrency)).slice(0, 3);
    const destinationCountry =
      channel === SaleChannel.EXPORT ? dto.destinationCountry?.trim() || null : null;
    const exportRef = channel === SaleChannel.EXPORT ? dto.exportRef?.trim() || null : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const reference = await this.nextReference(tx, businessId);
      return tx.sale.create({
        data: {
          businessId,
          reference,
          date: dto.date,
          partnerId: partner.id,
          channel,
          currency,
          destinationCountry,
          exportRef,
          notes: dto.notes?.trim() || null,
          paymentMode: payment.paymentMode,
          cashPaidTo: payment.cashPaidTo,
          creditInstrument: payment.creditInstrument,
          chequeNumber: payment.chequeNumber,
          bankName: payment.bankName,
          instrumentNote: payment.instrumentNote,
          lines: {
            create: parsedLines.map((line) => {
              const quality = qualityMap.get(line.qualityId)!;
              return {
                casingTypeId: quality.casingTypeId,
                qualityId: quality.id,
                qualityText: quality.name,
                quantity: line.quantity,
                unitId: unit.id,
                rate: line.rate,
              };
            }),
          },
        },
        include: { lines: true },
      });
    });

    const [row] = await this.present(requireBusinessId(actor), [created]);
    return row;
  }

  private async present(
    businessId: string,
    sales: Array<{
      id: string;
      reference: string;
      date: string;
      partnerId: string;
      channel: SaleChannel;
      currency: string;
      destinationCountry: string | null;
      exportRef: string | null;
      notes: string | null;
      paymentMode: PaymentMode;
      cashPaidTo: string | null;
      creditInstrument: CreditInstrument;
      chequeNumber: string | null;
      bankName: string | null;
      instrumentNote: string | null;
      lines: Array<{
        casingTypeId: string;
        qualityId: string;
        qualityText: string;
        quantity: Prisma.Decimal;
        unitId: string;
        rate: Prisma.Decimal | null;
      }>;
    }>,
  ) {
    const partnerIds = [...new Set(sales.map((item) => item.partnerId))];
    const unitIds = [...new Set(sales.flatMap((sale) => sale.lines.map((line) => line.unitId)))];
    const casingTypeIds = [...new Set(sales.flatMap((sale) => sale.lines.map((line) => line.casingTypeId)))];
    const [partners, units, casingTypes] = await Promise.all([
      this.prisma.partner.findMany({ where: { businessId, id: { in: partnerIds } } }),
      this.prisma.unit.findMany({ where: { businessId, id: { in: unitIds } } }),
      this.prisma.casingType.findMany({ where: { businessId, id: { in: casingTypeIds } } }),
    ]);
    const partnerName = new Map(partners.map((item) => [item.id, item.name]));
    const unitName = new Map(units.map((item) => [item.id, item.name]));
    const casingTypeName = new Map(casingTypes.map((item) => [item.id, item.name]));

    return sales.map((sale) => {
      const lines = sale.lines.map((line) => {
        const amount = line.rate ? line.quantity.mul(line.rate) : null;
        return {
          qualityId: line.qualityId,
          casingTypeId: line.casingTypeId,
          quality: line.qualityText,
          casingType: casingTypeName.get(line.casingTypeId) ?? '',
          quantity: qty(line.quantity),
          unit: unitName.get(line.unitId) ?? '',
          rate: line.rate ? line.rate.toFixed(2) : null,
          amount: amount ? amount.toFixed(2) : null,
        };
      });
      const totalQty = sale.lines.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0));
      const totalAmount = sale.lines.reduce((sum, line) => {
        if (!line.rate) return sum;
        return sum.plus(line.quantity.mul(line.rate));
      }, new Prisma.Decimal(0));
      const hasAmount = sale.lines.some((line) => line.rate);

      return {
        id: sale.id,
        reference: sale.reference,
        date: sale.date,
        customer: partnerName.get(sale.partnerId) ?? 'Customer',
        channel: sale.channel,
        lines,
        quantity: qty(totalQty),
        amount: hasAmount ? totalAmount.toFixed(2) : null,
        currency: sale.currency,
        destinationCountry: sale.destinationCountry,
        exportRef: sale.exportRef,
        paymentMode: sale.paymentMode,
        cashPaidTo: sale.cashPaidTo,
        creditInstrument: sale.creditInstrument,
        chequeNumber: sale.chequeNumber,
        bankName: sale.bankName,
        instrumentNote: sale.instrumentNote,
        notes: sale.notes,
      };
    });
  }

  private checkedPayment(dto: CreateSaleDto): {
    paymentMode: PaymentMode;
    cashPaidTo: string | null;
    creditInstrument: CreditInstrument;
    chequeNumber: string | null;
    bankName: string | null;
    instrumentNote: string | null;
  } {
    if (dto.paymentMode === PaymentMode.CASH) {
      const cashPaidTo = dto.cashPaidTo?.trim();
      if (!cashPaidTo) {
        throw new BadRequestException('For cash payment, enter the person the money was given to.');
      }
      return {
        paymentMode: PaymentMode.CASH,
        cashPaidTo,
        creditInstrument: CreditInstrument.NONE,
        chequeNumber: null,
        bankName: null,
        instrumentNote: null,
      };
    }

    const creditInstrument = dto.creditInstrument ?? CreditInstrument.NONE;
    if (creditInstrument === CreditInstrument.CHEQUE) {
      const chequeNumber = dto.chequeNumber?.trim();
      const bankName = dto.bankName?.trim();
      if (!chequeNumber || !bankName) {
        throw new BadRequestException('For a cheque on credit, enter the cheque number and bank.');
      }
      return {
        paymentMode: PaymentMode.CREDIT,
        cashPaidTo: null,
        creditInstrument,
        chequeNumber,
        bankName,
        instrumentNote: null,
      };
    }

    if (creditInstrument === CreditInstrument.OTHER) {
      const instrumentNote = dto.instrumentNote?.trim();
      if (!instrumentNote) {
        throw new BadRequestException('Describe what was given for this credit sale.');
      }
      return {
        paymentMode: PaymentMode.CREDIT,
        cashPaidTo: null,
        creditInstrument,
        chequeNumber: null,
        bankName: null,
        instrumentNote,
      };
    }

    return {
      paymentMode: PaymentMode.CREDIT,
      cashPaidTo: null,
      creditInstrument: CreditInstrument.NONE,
      chequeNumber: null,
      bankName: null,
      instrumentNote: null,
    };
  }

  private numberUnit(businessId: string) {
    return this.prisma.unit.upsert({
      where: { businessId_code: { businessId, code: 'NUMBER' } },
      update: {},
      create: { businessId, code: 'NUMBER', name: 'Number', comparableGroup: 'number' },
    });
  }

  private async nextReference(tx: Prisma.TransactionClient, businessId: string) {
    const current = await tx.sequence.upsert({
      where: { businessId_key: { businessId, key: 'sale' } },
      update: { value: { increment: 1 } },
      create: { businessId, key: 'sale', value: 1 },
    });
    return `SAL-${String(current.value).padStart(4, '0')}`;
  }
}
