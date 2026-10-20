import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseLineDto, ExpenseQueryDto, SaveDayExpensesDto } from './dto';

function money(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(2).replace(/\.?0+$/, '') || '0';
}

function qty(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toFixed(3).replace(/\.?0+$/, '') || '0';
}

function isSalt(category: string) {
  return category.trim().toLowerCase() === 'salt';
}

function isLabour(category: string) {
  return category.trim().toLowerCase() === 'labour';
}

function resolveLine(line: ExpenseLineDto) {
  const category = line.category.trim();
  const bags = line.bags?.trim() ? new Prisma.Decimal(line.bags.trim()) : null;
  const rate = line.rate?.trim() ? new Prisma.Decimal(line.rate.trim()) : null;

  if (isSalt(category)) {
    if (!bags || !rate) {
      throw new BadRequestException('Salt lines need number of bags and rate per bag.');
    }
    if (bags.lte(0) || rate.lte(0)) {
      throw new BadRequestException('Salt bags and rate must be greater than zero.');
    }
    return {
      bags,
      rate,
      amount: bags.mul(rate).toDecimalPlaces(2),
    };
  }

  return {
    bags: null,
    rate: null,
    amount: new Prisma.Decimal(line.amount),
  };
}

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async day(actor: Actor, query: ExpenseQueryDto) {
    const businessId = requireBusinessId(actor);
    const [lines, workers] = await Promise.all([
      this.prisma.dailyExpense.findMany({
        where: { businessId, date: query.date },
        include: { membership: { include: { user: { select: { name: true } } } } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.membership.findMany({
        where: { businessId, role: 'WORKER', active: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const total = lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
    return {
      date: query.date,
      total: money(total),
      workers: workers
        .map((member) => ({ id: member.id, name: member.user.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      lines: lines.map((line) => ({
        id: line.id,
        date: line.date,
        sortOrder: line.sortOrder,
        particulars: line.particulars,
        category: line.category,
        bags: line.bags == null ? null : qty(line.bags),
        rate: line.rate == null ? null : money(line.rate),
        amount: money(line.amount),
        paidTo: line.paidTo,
        membershipId: line.membershipId,
        workerName: line.membership?.user.name ?? null,
        notes: line.notes,
      })),
    };
  }

  async saveDay(actor: Actor, dto: SaveDayExpensesDto) {
    const businessId = requireBusinessId(actor);
    const keptIds = dto.lines.map((line) => line.id).filter((id): id is string => Boolean(id));
    const membershipIds = [
      ...new Set(dto.lines.map((line) => line.membershipId).filter((id): id is string => Boolean(id))),
    ];

    if (membershipIds.length) {
      const workers = await this.prisma.membership.findMany({
        where: { businessId, id: { in: membershipIds }, role: 'WORKER', active: true },
        include: { user: { select: { name: true } } },
      });
      if (workers.length !== membershipIds.length) {
        throw new BadRequestException('Choose a worker from Users for Labour lines.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.dailyExpense.deleteMany({
        where: {
          businessId,
          date: dto.date,
          ...(keptIds.length ? { id: { notIn: keptIds } } : {}),
        },
      });

      for (const [index, line] of dto.lines.entries()) {
        const resolved = resolveLine(line);
        const membershipId = isLabour(line.category) ? line.membershipId || null : null;
        let paidTo = line.paidTo?.trim() || null;
        if (membershipId && !paidTo) {
          const worker = await tx.membership.findFirst({
            where: { id: membershipId, businessId },
            include: { user: { select: { name: true } } },
          });
          paidTo = worker?.user.name ?? null;
        }

        const data = {
          particulars: line.particulars.trim(),
          category: line.category.trim(),
          bags: resolved.bags,
          rate: resolved.rate,
          amount: resolved.amount,
          paidTo,
          membershipId,
          notes: line.notes?.trim() || null,
          sortOrder: index,
        };

        if (line.id) {
          const existing = await tx.dailyExpense.findFirst({
            where: { id: line.id, businessId, date: dto.date },
          });
          if (existing) {
            await tx.dailyExpense.update({ where: { id: existing.id }, data });
            continue;
          }
        }

        await tx.dailyExpense.create({
          data: {
            businessId,
            date: dto.date,
            ...data,
          },
        });
      }
    });

    return this.day(actor, { date: dto.date });
  }
}
