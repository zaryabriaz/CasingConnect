import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SendMailboxDto } from './dto';

const MAX_BATCH = 25;
const SEND_GAP_MS = 450;

@Injectable()
export class MailboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  preview(subject?: string, body?: string) {
    return this.mail.previewCustomAdminMail(subject ?? '', body ?? '');
  }

  async list() {
    const rows = await this.prisma.adminOutboundEmail.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    return rows.map((row) => this.present(row));
  }

  async send(userId: string, dto: SendMailboxDto) {
    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.',
      );
    }

    const toEmails = [
      ...new Set(
        (dto.toEmails ?? [])
          .map((value) => value.trim().toLowerCase())
          .filter((value) => value.includes('@')),
      ),
    ];
    if (toEmails.length === 0) {
      throw new BadRequestException('Add at least one recipient email.');
    }
    if (toEmails.length > MAX_BATCH) {
      throw new BadRequestException(`Send at most ${MAX_BATCH} emails per batch.`);
    }

    const subject = dto.subject.trim();
    const body = dto.body.trim();
    if (!subject) throw new BadRequestException('Subject is required.');
    if (!body) throw new BadRequestException('Message body is required.');

    const results: Array<{ email: string; ok: boolean; reason?: string }> = [];

    for (const email of toEmails) {
      const sent = await this.mail.sendCustomAdminMail({
        to: email,
        subject,
        text: body,
      });
      results.push({
        email,
        ok: sent.sent,
        reason: sent.sent ? undefined : sent.reason,
      });
      if (sent.sent) await sleep(SEND_GAP_MS);
    }

    const sentCount = results.filter((row) => row.ok).length;
    const failedCount = results.length - sentCount;

    const row = await this.prisma.adminOutboundEmail.create({
      data: {
        toEmails,
        subject,
        bodyText: body,
        sentCount,
        failedCount,
        results: results as unknown as Prisma.InputJsonValue,
        createdByUserId: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      ...this.present(row),
      requested: toEmails.length,
      sent: sentCount,
      failed: failedCount,
      results,
    };
  }

  private present(row: {
    id: string;
    toEmails: string[];
    subject: string;
    bodyText: string;
    sentCount: number;
    failedCount: number;
    results: Prisma.JsonValue;
    createdByUserId: string | null;
    createdAt: Date;
    createdBy?: { id: string; name: string; email: string } | null;
  }) {
    return {
      id: row.id,
      toEmails: row.toEmails,
      subject: row.subject,
      bodyText: row.bodyText,
      sentCount: row.sentCount,
      failedCount: row.failedCount,
      results: row.results,
      createdByUserId: row.createdByUserId,
      createdBy: row.createdBy
        ? {
            id: row.createdBy.id,
            name: row.createdBy.name,
            email: row.createdBy.email,
          }
        : null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
