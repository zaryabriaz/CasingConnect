import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreditInstrument, IncomingMaterial, PackageKind, PaymentMode, Prisma } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { isUniqueConflict } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceiptDto } from './dto';

const LABELS: Record<IncomingMaterial, string> = {
  RODA: 'Roda',
  EIGHTEEN_UP: '18/UP',
  QUALITY: 'Quality',
};

function trimQuantity(value: Prisma.Decimal) {
  return value.toFixed(3).replace(/\.?0+$/, '') || '0';
}

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async store(actor: Actor) {
    const receipts = await this.prisma.materialReceipt.findMany({
      where: { businessId: requireBusinessId(actor), destination: 'STORE' },
      include: {
        packages: {
          where: { status: 'IN_STORE' },
          orderBy: [{ kind: 'asc' }, { packageNumber: 'asc' }],
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    const presented = await this.present(requireBusinessId(actor), receipts);
    const byRef = new Map(receipts.map((receipt) => [receipt.reference, receipt]));
    return presented
      .map((receipt) => {
        const raw = byRef.get(receipt.reference);
        const packages = [...(raw?.packages ?? [])].sort((a, b) => {
          if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
          const na = Number(a.packageNumber);
          const nb = Number(b.packageNumber);
          if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
          return a.packageNumber.localeCompare(b.packageNumber, undefined, { numeric: true });
        });
        const quantity = packages.reduce((sum, item) => sum.plus(item.quantity), new Prisma.Decimal(0));
        return {
          batch: receipt.reference,
          date: receipt.date,
          supplier: receipt.supplier,
          material: receipt.material,
          quantity: trimQuantity(quantity),
          packages: packages.map((item) => ({
            id: item.id,
            kind: item.kind,
            packageNumber: item.packageNumber,
            quantity: trimQuantity(item.quantity),
          })),
        };
      })
      .filter((receipt) => receipt.packages.length > 0);
  }

  async list(actor: Actor) {
    const receipts = await this.prisma.materialReceipt.findMany({
      where: { businessId: requireBusinessId(actor) },
      include: { packages: { orderBy: [{ kind: 'asc' }, { packageNumber: 'asc' }] } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
    return this.present(requireBusinessId(actor), receipts);
  }

  async create(actor: Actor, dto: CreateReceiptDto) {
    const quantity = new Prisma.Decimal(dto.quantity);
    if (quantity.lte(0)) throw new BadRequestException('Quantity must be greater than zero.');
    const rate = new Prisma.Decimal(dto.rate);
    if (rate.lte(0)) throw new BadRequestException('Rate must be greater than zero.');

    const [partner, unit, casingTypes, quality] = await Promise.all([
      this.prisma.partner.findFirst({ where: { id: dto.partnerId, businessId: requireBusinessId(actor), active: true } }),
      this.numberUnit(requireBusinessId(actor)),
      this.prisma.casingType.findMany({
        where: { businessId: requireBusinessId(actor), active: true },
        orderBy: { code: 'asc' },
      }),
      dto.qualityId
        ? this.prisma.quality.findFirst({ where: { id: dto.qualityId, businessId: requireBusinessId(actor), active: true } })
        : Promise.resolve(null),
    ]);

    if (!partner) throw new NotFoundException('Choose a supplier from this business.');
    if (casingTypes.length === 0) {
      throw new BadRequestException('No active casing type. Enable sheep, beef, or another type in Catalogue.');
    }
    const casingType =
      (dto.casingTypeId ? casingTypes.find((item) => item.id === dto.casingTypeId) : null) ??
      casingTypes.find((item) => item.code === 'SHEEP') ??
      casingTypes[0]!;
    if (dto.casingTypeId && casingType.id !== dto.casingTypeId) {
      throw new BadRequestException('That casing type is not active in this business.');
    }
    if (dto.materialForm === 'QUALITY' && !quality) {
      throw new BadRequestException('Choose the quality that was bought.');
    }
    if (quality && quality.casingTypeId !== casingType.id) {
      throw new BadRequestException('That quality belongs to a different casing type.');
    }
    if (dto.materialForm !== 'QUALITY' && dto.qualityId) {
      throw new BadRequestException('Roda and 18/UP are recorded as a number, not as a named quality.');
    }

    const packages = this.checkedPackages(dto.destination, quantity, dto.packages ?? []);
    const payment = this.checkedPayment(dto);

    const material = dto.materialForm === 'QUALITY' && quality ? quality.name : LABELS[dto.materialForm];
    const currency = partner.currency ?? 'PKR';

    const created = await this.prisma.$transaction(async (tx) => {
      const reference = await this.nextReference(tx, requireBusinessId(actor));
      const batch = await tx.batch.create({
        data: {
          businessId: requireBusinessId(actor),
          reference,
          casingTypeId: casingType.id,
          qualityId: quality?.id,
          materialForm: dto.materialForm,
          stage: dto.destination === 'STORE' ? 'READY_FOR_STORAGE' : 'RAW',
          ownership: 'COMPANY',
          partnerId: partner.id,
          quantity,
          unitId: unit.id,
        },
      });
      const receipt = await tx.materialReceipt.create({
        data: {
          businessId: requireBusinessId(actor),
          reference,
          date: dto.date,
          partnerId: partner.id,
          materialForm: dto.materialForm,
          casingTypeId: casingType.id,
          qualityId: quality?.id,
          qualityText: material,
          quantity,
          unitId: unit.id,
          rate,
          currency,
          ownership: 'COMPANY',
          batchId: batch.id,
          notes: dto.notes?.trim() || null,
          destination: dto.destination,
          paymentMode: payment.paymentMode,
          cashPaidTo: payment.cashPaidTo,
          creditInstrument: payment.creditInstrument,
          chequeNumber: payment.chequeNumber,
          bankName: payment.bankName,
          instrumentNote: payment.instrumentNote,
          packages: {
            create: packages.map((item) => ({
              businessId: requireBusinessId(actor),
              kind: item.kind,
              packageNumber: item.packageNumber,
              quantity: item.quantity,
            })),
          },
        },
        include: { packages: true },
      });
      await tx.inventoryMovement.create({
        data: {
          businessId: requireBusinessId(actor),
          date: dto.date,
          reason: 'RECEIPT',
          batchId: batch.id,
          ownership: 'COMPANY',
          stage: dto.destination === 'STORE' ? 'READY_FOR_STORAGE' : 'RAW',
          casingTypeId: casingType.id,
          qualityId: quality?.id,
          quantityDelta: quantity,
          unitId: unit.id,
          sourceKey: `receipt:${receipt.id}`,
        },
      });
      return receipt;
    }).catch((error: unknown) => {
      if (isUniqueConflict(error)) {
        throw new ConflictException('That bag or drum number is already recorded.');
      }
      throw error;
    });

    const [row] = await this.present(requireBusinessId(actor), [created]);
    return row;
  }

  async setRate(actor: Actor, id: string, rateText: string) {
    const rate = new Prisma.Decimal(rateText);
    if (rate.lte(0)) throw new BadRequestException('Rate must be greater than zero.');

    const existing = await this.prisma.materialReceipt.findFirst({
      where: { id, businessId: requireBusinessId(actor) },
      include: { packages: { orderBy: [{ kind: 'asc' }, { packageNumber: 'asc' }] } },
    });
    if (!existing) throw new NotFoundException('Purchase not found.');

    const updated = await this.prisma.materialReceipt.update({
      where: { id: existing.id },
      data: { rate },
      include: { packages: { orderBy: [{ kind: 'asc' }, { packageNumber: 'asc' }] } },
    });
    const [row] = await this.present(requireBusinessId(actor), [updated]);
    return row;
  }

  private async present(
    businessId: string,
    receipts: Array<{
      id: string;
      reference: string;
      date: string;
      partnerId: string;
      materialForm: IncomingMaterial;
      qualityText: string;
      quantity: Prisma.Decimal;
      unitId: string;
      rate: Prisma.Decimal | null;
      currency: string;
      locationId: string | null;
      notes: string | null;
      destination: 'FACTORY' | 'STORE';
      paymentMode: PaymentMode;
      cashPaidTo: string | null;
      creditInstrument: CreditInstrument;
      chequeNumber: string | null;
      bankName: string | null;
      instrumentNote: string | null;
      packages: Array<{ kind: PackageKind; packageNumber: string; quantity: Prisma.Decimal }>;
    }>,
  ) {
    const partnerIds = [...new Set(receipts.map((item) => item.partnerId))];
    const unitIds = [...new Set(receipts.map((item) => item.unitId))];
    const locationIds = [...new Set(receipts.map((item) => item.locationId).filter((id): id is string => Boolean(id)))];
    const [partners, units, locations] = await Promise.all([
      this.prisma.partner.findMany({ where: { businessId, id: { in: partnerIds } } }),
      this.prisma.unit.findMany({ where: { businessId, id: { in: unitIds } } }),
      this.prisma.location.findMany({ where: { businessId, id: { in: locationIds } } }),
    ]);
    const partnerName = new Map(partners.map((item) => [item.id, item.name]));
    const unitName = new Map(units.map((item) => [item.id, item.name]));
    const placeName = new Map(locations.map((item) => [item.id, item.name]));

    return receipts.map((receipt) => {
      const amount = receipt.rate ? receipt.quantity.mul(receipt.rate) : null;
      return {
        id: receipt.id,
        reference: receipt.reference,
        date: receipt.date,
        supplier: partnerName.get(receipt.partnerId) ?? 'Supplier',
        material: receipt.qualityText,
        materialForm: receipt.materialForm,
        quantity: trimQuantity(receipt.quantity),
        unit: unitName.get(receipt.unitId) ?? '',
        rate: receipt.rate ? receipt.rate.toFixed(2) : null,
        amount: amount ? amount.toFixed(2) : null,
        currency: receipt.currency,
        place: receipt.locationId ? placeName.get(receipt.locationId) ?? '' : '',
        destination: receipt.destination,
        paymentMode: receipt.paymentMode,
        cashPaidTo: receipt.cashPaidTo,
        creditInstrument: receipt.creditInstrument,
        chequeNumber: receipt.chequeNumber,
        bankName: receipt.bankName,
        instrumentNote: receipt.instrumentNote,
        packages: receipt.packages.map((item) => ({
          kind: item.kind,
          packageNumber: item.packageNumber,
          quantity: trimQuantity(item.quantity),
        })),
        notes: receipt.notes,
      };
    });
  }

  private checkedPayment(dto: CreateReceiptDto): {
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
        throw new BadRequestException('Describe what was given for this credit purchase.');
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

  private checkedPackages(
    destination: 'FACTORY' | 'STORE',
    total: Prisma.Decimal,
    lines: Array<{ kind: PackageKind; packageNumber: string; quantity: string }>,
  ) {
    if (destination === 'FACTORY') {
      if (lines.length > 0) {
        throw new BadRequestException('Material sent to the factory stays as a number. Bags and drums are recorded when it goes to the store.');
      }
      return [];
    }
    if (lines.length === 0) {
      throw new BadRequestException('Material sent to the store needs each bag or drum, with its number and quantity.');
    }
    const seen = new Set<string>();
    const parsed = lines.map((line) => {
      const packageNumber = line.packageNumber.trim();
      const quantity = new Prisma.Decimal(line.quantity);
      const key = `${line.kind}:${packageNumber.toLowerCase()}`;
      if (!packageNumber) throw new BadRequestException('Each bag or drum needs a number.');
      if (quantity.lte(0)) throw new BadRequestException('Each bag or drum needs a quantity greater than zero.');
      if (seen.has(key)) throw new BadRequestException(`${line.kind === 'BAG' ? 'Bag' : 'Drum'} ${packageNumber} is listed twice.`);
      seen.add(key);
      return { kind: line.kind, packageNumber, quantity };
    });
    const packed = parsed.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0));
    if (!packed.equals(total)) {
      throw new BadRequestException(
        `The bags and drums add up to ${trimQuantity(packed)}, but ${trimQuantity(total)} were bought. The numbers must match.`,
      );
    }
    return parsed;
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
      where: { businessId_key: { businessId, key: 'receipt' } },
      update: { value: { increment: 1 } },
      create: { businessId, key: 'receipt', value: 1 },
    });
    return `RCP-${String(current.value).padStart(4, '0')}`;
  }
}
