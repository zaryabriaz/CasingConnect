import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Actor, requireBusinessId } from '../common/actor';
import { isUniqueConflict } from '../common/prisma-errors';
import { clean, emptyToNull, hasAny } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto, CreateMemberDto, UpdateBusinessDto, UpdateLocationDto, UpdateMemberDto } from './dto';
import { toBusiness, toLocation, toMember } from './mappers';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(actor: Actor) {
    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: requireBusinessId(actor) } });
    const where = { businessId: requireBusinessId(actor), active: true };
    const [locations, members, partners, qualities] = await Promise.all([
      this.prisma.location.count({ where }),
      this.prisma.membership.count({ where }),
      this.prisma.partner.count({ where }),
      this.prisma.quality.count({ where }),
    ]);
    return { ...toBusiness(business), counts: { locations, members, partners, qualities } };
  }

  async update(actor: Actor, dto: UpdateBusinessDto) {
    if (!hasAny(dto)) throw new BadRequestException('Provide a field to update.');
    const business = await this.prisma.business.update({
      where: { id: requireBusinessId(actor) },
      data: {
        name: dto.name === undefined ? undefined : clean(dto.name),
        legalName: emptyToNull(dto.legalName),
        activities: dto.activities,
        currency: dto.currency?.toUpperCase(),
        phone: emptyToNull(dto.phone),
        email: dto.email === undefined ? undefined : emptyToNull(dto.email)?.toLowerCase() ?? null,
        address: emptyToNull(dto.address),
        city: emptyToNull(dto.city),
        country: dto.country === undefined ? undefined : clean(dto.country) || 'Pakistan',
        description: emptyToNull(dto.description),
      },
    });
    return toBusiness(business);
  }

  async listLocations(actor: Actor) {
    const locations = await this.prisma.location.findMany({
      where: { businessId: requireBusinessId(actor) },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    return locations.map(toLocation);
  }

  async createLocation(actor: Actor, dto: CreateLocationDto) {
    try {
      const location = await this.prisma.location.create({
        data: {
          businessId: requireBusinessId(actor),
          name: clean(dto.name),
          kind: dto.kind,
          address: emptyToNull(dto.address),
          city: emptyToNull(dto.city),
          country: emptyToNull(dto.country),
          phone: emptyToNull(dto.phone),
        },
      });
      return toLocation(location);
    } catch (error) {
      if (isUniqueConflict(error)) throw new ConflictException('This business already has a place with that name.');
      throw error;
    }
  }

  async updateLocation(actor: Actor, id: string, dto: UpdateLocationDto) {
    if (!hasAny(dto)) throw new BadRequestException('Provide a field to update.');
    await this.requireLocation(requireBusinessId(actor), id);
    try {
      const location = await this.prisma.location.update({
        where: { id },
        data: {
          name: dto.name === undefined ? undefined : clean(dto.name),
          kind: dto.kind,
          address: emptyToNull(dto.address),
          city: emptyToNull(dto.city),
          country: emptyToNull(dto.country),
          phone: emptyToNull(dto.phone),
          active: dto.active,
        },
      });
      return toLocation(location);
    } catch (error) {
      if (isUniqueConflict(error)) throw new ConflictException('This business already has a place with that name.');
      throw error;
    }
  }

  async listMembers(actor: Actor) {
    const members = await this.prisma.membership.findMany({
      where: { businessId: requireBusinessId(actor) },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    });
    return members.map(toMember);
  }

  async createMember(actor: Actor, dto: CreateMemberDto) {
    const isWorker = dto.role === 'WORKER';
    const emailInput = dto.email?.trim().toLowerCase();
    if (!isWorker && !emailInput) {
      throw new BadRequestException('Email is required for this role.');
    }

    let user;
    if (emailInput) {
      const existing = await this.prisma.user.findUnique({ where: { email: emailInput } });
      if (!existing && !dto.password && !isWorker) {
        throw new BadRequestException('Set a password when this person does not already have an account.');
      }
      user =
        existing ??
        (await this.prisma.user.create({
          data: {
            name: clean(dto.name),
            email: emailInput,
            passwordHash: await bcrypt.hash(dto.password || randomUUID(), 10),
          },
        }));
    } else {
      const placeholderEmail = `worker.${randomUUID().replace(/-/g, '')}@users.casingconnect.local`;
      user = await this.prisma.user.create({
        data: {
          name: clean(dto.name),
          email: placeholderEmail,
          passwordHash: await bcrypt.hash(randomUUID(), 10),
        },
      });
    }

    const prior = await this.prisma.membership.findUnique({
      where: { businessId_userId: { businessId: requireBusinessId(actor), userId: user.id } },
    });
    if (prior?.active) throw new ConflictException('This person is already on the team.');

    const membership = prior
      ? await this.prisma.membership.update({
          where: { id: prior.id },
          data: { role: dto.role, title: emptyToNull(dto.title), active: true },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
      : await this.prisma.membership.create({
          data: {
            businessId: requireBusinessId(actor),
            userId: user.id,
            role: dto.role,
            title: emptyToNull(dto.title),
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        });

    return toMember(membership);
  }

  async updateMember(actor: Actor, id: string, dto: UpdateMemberDto) {
    if (!hasAny(dto)) throw new BadRequestException('Provide a field to update.');
    const membership = await this.prisma.membership.findFirst({
      where: { id, businessId: requireBusinessId(actor) },
    });
    if (!membership) throw new NotFoundException('That person was not found on this team.');

    const removesOwner =
      membership.role === 'OWNER' && ((dto.role !== undefined && dto.role !== 'OWNER') || dto.active === false);
    if (removesOwner) {
      const owners = await this.prisma.membership.count({
        where: { businessId: requireBusinessId(actor), role: 'OWNER', active: true },
      });
      if (owners <= 1) throw new BadRequestException('The business needs at least one active owner.');
    }

    const updated = await this.prisma.membership.update({
      where: { id },
      data: { role: dto.role, title: dto.title === undefined ? undefined : emptyToNull(dto.title), active: dto.active },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return toMember(updated);
  }

  private async requireLocation(businessId: string, id: string) {
    const location = await this.prisma.location.findFirst({ where: { id, businessId } });
    if (!location) throw new NotFoundException('That place was not found in this business.');
    return location;
  }
}
