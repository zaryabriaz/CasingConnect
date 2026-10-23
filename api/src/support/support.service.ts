import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupportMessageRole, SupportThreadStatus } from '@prisma/client';
import { Actor, requireBusinessId } from '../common/actor';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PostSupportMessageDto,
  SupportMessageDto,
  SupportThreadDto,
  UpdateSupportThreadDto,
} from './dto';

const MESSAGE_LIMIT = 200;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async getOrCreateCompanyThread(actor: Actor): Promise<SupportThreadDto> {
    const businessId = requireBusinessId(actor);
    const thread = await this.ensureThread(businessId);
    const messages = await this.prisma.supportMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: MESSAGE_LIMIT,
      include: { fromUser: { select: { id: true, name: true } } },
    });
    return this.presentThread(thread, messages.map((row) => this.presentMessage(row)));
  }

  async listCompanyMessages(
    actor: Actor,
    opts: { after?: string; afterId?: string },
  ): Promise<SupportMessageDto[]> {
    const businessId = requireBusinessId(actor);
    const thread = await this.prisma.supportThread.findUnique({ where: { businessId } });
    if (!thread) return [];
    return this.messagesAfter(thread.id, opts);
  }

  async postCompanyMessage(actor: Actor, dto: PostSupportMessageDto): Promise<SupportMessageDto> {
    const businessId = requireBusinessId(actor);
    if (!actor.userId) throw new ForbiddenException('Sign in required.');
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('Message cannot be empty.');

    const thread = await this.ensureThread(businessId);
    if (thread.status === SupportThreadStatus.CLOSED) {
      await this.prisma.supportThread.update({
        where: { id: thread.id },
        data: { status: SupportThreadStatus.OPEN },
      });
    }

    const previous = await this.prisma.supportMessage.findFirst({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'desc' },
      select: { fromRole: true },
    });

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({
        data: {
          threadId: thread.id,
          body,
          fromUserId: actor.userId,
          fromRole: SupportMessageRole.COMPANY,
        },
        include: { fromUser: { select: { id: true, name: true } } },
      });
      await tx.supportThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: created.createdAt, status: SupportThreadStatus.OPEN },
      });
      return created;
    });

    const shouldNotify =
      !previous || previous.fromRole === SupportMessageRole.ADMIN;
    if (shouldNotify) {
      const business = await this.prisma.business.findUniqueOrThrow({
        where: { id: businessId },
        select: { name: true, country: true },
      });
      void this.mail.notifySupportMessage({
        businessName: business.name,
        country: business.country,
        fromName: actor.name,
        fromEmail: actor.email,
        message: body,
        threadId: thread.id,
      });
    }

    return this.presentMessage(message);
  }

  async listAdminThreads(): Promise<SupportThreadDto[]> {
    const rows = await this.prisma.supportThread.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        business: { select: { id: true, name: true, country: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { fromUser: { select: { id: true, name: true } } },
        },
        _count: { select: { messages: true } },
      },
    });
    return rows.map((row) => {
      const last = row.messages[0];
      return {
        id: row.id,
        businessId: row.businessId,
        businessName: row.business.name,
        businessCountry: row.business.country,
        status: row.status,
        lastMessageAt: row.lastMessageAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        lastMessagePreview: last?.body.slice(0, 160) ?? null,
        lastMessageRole: last?.fromRole ?? null,
        messageCount: row._count.messages,
      };
    });
  }

  async getAdminThread(threadId: string): Promise<SupportThreadDto> {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
      include: { business: { select: { id: true, name: true, country: true } } },
    });
    if (!thread) throw new NotFoundException('Support thread not found.');
    const messages = await this.prisma.supportMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take: MESSAGE_LIMIT,
      include: { fromUser: { select: { id: true, name: true } } },
    });
    return this.presentThread(thread, messages.map((row) => this.presentMessage(row)));
  }

  async listAdminMessages(
    threadId: string,
    opts: { after?: string; afterId?: string },
  ): Promise<SupportMessageDto[]> {
    const thread = await this.prisma.supportThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Support thread not found.');
    return this.messagesAfter(threadId, opts);
  }

  async postAdminMessage(
    actor: Actor,
    threadId: string,
    dto: PostSupportMessageDto,
  ): Promise<SupportMessageDto> {
    if (!actor.isSuperAdmin) throw new ForbiddenException('Super admin access required.');
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('Message cannot be empty.');

    const thread = await this.prisma.supportThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Support thread not found.');

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({
        data: {
          threadId,
          body,
          fromUserId: actor.userId,
          fromRole: SupportMessageRole.ADMIN,
        },
        include: { fromUser: { select: { id: true, name: true } } },
      });
      await tx.supportThread.update({
        where: { id: threadId },
        data: { lastMessageAt: created.createdAt, status: SupportThreadStatus.OPEN },
      });
      return created;
    });

    return this.presentMessage(message);
  }

  async updateAdminThread(threadId: string, dto: UpdateSupportThreadDto): Promise<SupportThreadDto> {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
      include: { business: { select: { id: true, name: true, country: true } } },
    });
    if (!thread) throw new NotFoundException('Support thread not found.');
    const updated = await this.prisma.supportThread.update({
      where: { id: threadId },
      data: { status: dto.status },
      include: { business: { select: { id: true, name: true, country: true } } },
    });
    return this.presentThread(updated);
  }

  private async ensureThread(businessId: string) {
    const existing = await this.prisma.supportThread.findUnique({
      where: { businessId },
      include: { business: { select: { id: true, name: true, country: true } } },
    });
    if (existing) return existing;
    return this.prisma.supportThread.create({
      data: { businessId },
      include: { business: { select: { id: true, name: true, country: true } } },
    });
  }

  private async messagesAfter(
    threadId: string,
    opts: { after?: string; afterId?: string },
  ): Promise<SupportMessageDto[]> {
    let afterDate: Date | undefined;
    if (opts.afterId) {
      const anchor = await this.prisma.supportMessage.findFirst({
        where: { id: opts.afterId, threadId },
        select: { createdAt: true },
      });
      afterDate = anchor?.createdAt;
    } else if (opts.after) {
      const parsed = new Date(opts.after);
      if (!Number.isNaN(parsed.getTime())) afterDate = parsed;
    }

    const rows = await this.prisma.supportMessage.findMany({
      where: {
        threadId,
        ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: MESSAGE_LIMIT,
      include: { fromUser: { select: { id: true, name: true } } },
    });
    return rows.map((row) => this.presentMessage(row));
  }

  private presentThread(
    thread: {
      id: string;
      businessId: string;
      status: SupportThreadStatus;
      lastMessageAt: Date;
      createdAt: Date;
      business: { id: string; name: string; country: string | null };
    },
    messages?: SupportMessageDto[],
  ): SupportThreadDto {
    return {
      id: thread.id,
      businessId: thread.businessId,
      businessName: thread.business.name,
      businessCountry: thread.business.country,
      status: thread.status,
      lastMessageAt: thread.lastMessageAt.toISOString(),
      createdAt: thread.createdAt.toISOString(),
      messages,
    };
  }

  private presentMessage(row: {
    id: string;
    body: string;
    fromUserId: string;
    fromRole: SupportMessageRole;
    createdAt: Date;
    fromUser: { id: string; name: string };
  }): SupportMessageDto {
    return {
      id: row.id,
      body: row.body,
      fromUserId: row.fromUserId,
      fromUserName: row.fromUser.name,
      fromRole: row.fromRole,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
