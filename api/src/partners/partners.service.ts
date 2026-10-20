import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { emptyToNull, hasAny } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';
import { PartnerBodyDto, PartnerQueryDto, UpdatePartnerDto } from './dto';

const partnerSelect = {
  id: true,
  name: true,
  roles: true,
  phone: true,
  email: true,
  country: true,
  address: true,
  currency: true,
  paymentTerms: true,
  notes: true,
  active: true,
} satisfies Prisma.PartnerSelect;

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: Actor, query: PartnerQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.PartnerWhereInput = {
      businessId: requireBusinessId(actor),
      active: query.includeInactive ? undefined : true,
      roles: query.role ? { has: query.role } : undefined,
      name: query.q ? { contains: query.q.trim(), mode: 'insensitive' } : undefined,
    };
    const [items, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        select: partnerSelect,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.partner.count({ where }),
    ]);
    return { items, page, pageSize, total };
  }

  async get(actor: Actor, id: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, businessId: requireBusinessId(actor) },
      select: partnerSelect,
    });
    if (!partner) throw new NotFoundException('That partner was not found in this business.');
    return partner;
  }

  async create(actor: Actor, dto: PartnerBodyDto) {
    return this.prisma.partner.create({
      data: {
        businessId: requireBusinessId(actor),
        name: dto.name.trim(),
        roles: dto.roles,
        phone: emptyToNull(dto.phone),
        email: emptyToNull(dto.email)?.toLowerCase() ?? null,
        country: emptyToNull(dto.country),
        address: emptyToNull(dto.address),
        currency: dto.currency?.toUpperCase() ?? null,
        paymentTerms: emptyToNull(dto.paymentTerms),
        notes: emptyToNull(dto.notes),
      },
      select: partnerSelect,
    });
  }

  async update(actor: Actor, id: string, dto: UpdatePartnerDto) {
    if (!hasAny(dto)) throw new BadRequestException('Provide a field to update.');
    await this.get(actor, id);
    return this.prisma.partner.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim(),
        roles: dto.roles,
        phone: emptyToNull(dto.phone),
        email: dto.email === undefined ? undefined : emptyToNull(dto.email)?.toLowerCase() ?? null,
        country: emptyToNull(dto.country),
        address: emptyToNull(dto.address),
        currency: dto.currency === undefined ? undefined : dto.currency.toUpperCase(),
        paymentTerms: emptyToNull(dto.paymentTerms),
        notes: emptyToNull(dto.notes),
        active: dto.active,
      },
      select: partnerSelect,
    });
  }
}
