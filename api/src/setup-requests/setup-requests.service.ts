import { Injectable, NotFoundException } from '@nestjs/common';
import { TailoredSetupRequestStatus } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTailoredSetupRequestDto,
  TailoredSetupRequestDto,
  UpdateTailoredSetupRequestDto,
} from './dto';

@Injectable()
export class SetupRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateTailoredSetupRequestDto): Promise<TailoredSetupRequestDto> {
    const row = await this.prisma.tailoredSetupRequest.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        companyName: dto.companyName?.trim() || null,
        country: dto.country.trim(),
        message: dto.message.trim(),
      },
    });
    const mapped = this.toDto(row);
    // Never fail the public form if email delivery has a problem.
    void this.mail.notifySetupRequest(mapped);
    return mapped;
  }

  async list(status?: TailoredSetupRequestStatus): Promise<TailoredSetupRequestDto[]> {
    const rows = await this.prisma.tailoredSetupRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return rows.map((row) => this.toDto(row));
  }

  async update(id: string, dto: UpdateTailoredSetupRequestDto): Promise<TailoredSetupRequestDto> {
    const existing = await this.prisma.tailoredSetupRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Request not found.');
    const row = await this.prisma.tailoredSetupRequest.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
      },
    });
    return this.toDto(row);
  }

  async remove(id: string) {
    const existing = await this.prisma.tailoredSetupRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Request not found.');
    await this.prisma.tailoredSetupRequest.delete({ where: { id } });
    return { ok: true };
  }

  private toDto(row: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    companyName: string | null;
    country: string;
    message: string;
    status: TailoredSetupRequestStatus;
    notes: string | null;
    createdAt: Date;
  }): TailoredSetupRequestDto {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      companyName: row.companyName,
      country: row.country,
      message: row.message,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
