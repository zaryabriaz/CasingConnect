import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessActivity, ExportDocumentType, MemberRole, Prisma } from '@prisma/client';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { Actor, requireBusinessId } from '../common/actor';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExportDocumentDto,
  ExportDocumentResponseDto,
  ExportLetterheadDto,
} from './dto';
import { generateExportPdf, letterheadDiskPath } from './pdf.generator';

const MANAGE_ROLES: MemberRole[] = [MemberRole.OWNER, MemberRole.MANAGER];
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  private uploadsRoot() {
    return join(process.cwd(), 'uploads');
  }

  private assertCanManage(actor: Actor) {
    if (actor.isSuperAdmin && actor.impersonating) return;
    if (!actor.role || !MANAGE_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Only owners and managers can manage export letterhead and documents.');
    }
  }

  private async assertExporter(businessId: string) {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { activities: true },
    });
    if (!business.activities.includes(BusinessActivity.EXPORTER)) {
      throw new ForbiddenException(
        'Export documents are only available when this company is marked as an Exporter.',
      );
    }
  }

  private async membershipId(actor: Actor, businessId: string) {
    if (!actor.userId) return null;
    const membership = await this.prisma.membership.findFirst({
      where: { businessId, userId: actor.userId, active: true },
      select: { id: true },
    });
    return membership?.id ?? null;
  }

  async getLetterhead(actor: Actor): Promise<ExportLetterheadDto> {
    const businessId = requireBusinessId(actor);
    await this.assertExporter(businessId);
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { name: true, exportLetterheadUrl: true },
    });
    return {
      businessName: business.name,
      letterheadUrl: business.exportLetterheadUrl,
    };
  }

  async uploadLetterhead(
    actor: Actor,
    file: Express.Multer.File | undefined,
  ): Promise<ExportLetterheadDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    await this.assertExporter(businessId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Choose a letterhead image (JPG, PNG, or WebP).');
    }
    const extension = ALLOWED_MIME[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Use a JPG, PNG, or WebP image for the letterhead.');
    }

    const existing = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { exportLetterheadUrl: true, name: true },
    });
    await this.unlinkExportUpload(existing.exportLetterheadUrl);

    const relativeDir = join('exports', businessId, 'letterhead');
    const absoluteDir = join(this.uploadsRoot(), relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    const filename = `letterhead-${Date.now()}${extension}`;
    await writeFile(join(absoluteDir, filename), file.buffer);
    const url = `/uploads/${relativeDir.replace(/\\/g, '/')}/${filename}`;

    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: { exportLetterheadUrl: url },
      select: { name: true, exportLetterheadUrl: true },
    });
    return {
      businessName: business.name,
      letterheadUrl: business.exportLetterheadUrl,
    };
  }

  async removeLetterhead(actor: Actor): Promise<ExportLetterheadDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    await this.assertExporter(businessId);
    const existing = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { exportLetterheadUrl: true },
    });
    await this.unlinkExportUpload(existing.exportLetterheadUrl);
    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: { exportLetterheadUrl: null },
      select: { name: true, exportLetterheadUrl: true },
    });
    return {
      businessName: business.name,
      letterheadUrl: business.exportLetterheadUrl,
    };
  }

  async listDocuments(actor: Actor): Promise<ExportDocumentResponseDto[]> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    await this.assertExporter(businessId);
    const rows = await this.prisma.exportDocument.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => this.present(row));
  }

  async createDocument(
    actor: Actor,
    dto: CreateExportDocumentDto,
  ): Promise<ExportDocumentResponseDto> {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    await this.assertExporter(businessId);
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { name: true, exportLetterheadUrl: true, currency: true },
    });

    const relativeDir = join('exports', businessId, 'pdfs');
    const absoluteDir = join(this.uploadsRoot(), relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    const filename = `${dto.type.toLowerCase()}-${Date.now()}.pdf`;
    const absolutePdf = join(absoluteDir, filename);
    const pdfUrl = `/uploads/${relativeDir.replace(/\\/g, '/')}/${filename}`;

    const letterheadAbs = letterheadDiskPath(this.uploadsRoot(), business.exportLetterheadUrl);
    await generateExportPdf({
      businessName: business.name,
      letterheadAbsolutePath: letterheadAbs,
      dto: {
        ...dto,
        currency: dto.currency?.trim() || business.currency || 'USD',
      },
      outputAbsolutePath: absolutePdf,
    });

    const createdByMembershipId = await this.membershipId(actor, businessId);
    const payload = JSON.parse(
      JSON.stringify({
        title: dto.title ?? null,
        incoterms: dto.incoterms ?? null,
        currency: dto.currency?.trim() || business.currency || 'USD',
        paymentTerms: dto.paymentTerms ?? null,
        destinationCountry: dto.destinationCountry ?? null,
        vesselOrFlight: dto.vesselOrFlight ?? null,
        containerNo: dto.containerNo ?? null,
        notes: dto.notes ?? null,
        lines: dto.lines,
      }),
    ) as Prisma.InputJsonValue;

    const row = await this.prisma.exportDocument.create({
      data: {
        businessId,
        type: dto.type,
        documentNumber: dto.documentNumber.trim(),
        title: dto.title?.trim() || null,
        buyerName: dto.buyerName.trim(),
        buyerAddress: dto.buyerAddress?.trim() || null,
        documentDate: new Date(dto.documentDate),
        payload,
        pdfUrl,
        createdByMembershipId,
      },
    });
    return this.present(row);
  }

  async getDocumentPdfPath(actor: Actor, id: string) {
    this.assertCanManage(actor);
    const businessId = requireBusinessId(actor);
    await this.assertExporter(businessId);
    const row = await this.prisma.exportDocument.findFirst({
      where: { id, businessId },
    });
    if (!row) throw new NotFoundException('Export document not found.');
    const absolute = letterheadDiskPath(this.uploadsRoot(), row.pdfUrl);
    if (!absolute) throw new NotFoundException('PDF file missing.');
    return { absolute, filename: `${row.documentNumber}.pdf`, pdfUrl: row.pdfUrl };
  }

  private async unlinkExportUpload(url: string | null | undefined) {
    if (!url?.startsWith('/uploads/exports/')) return;
    const previous = join(this.uploadsRoot(), url.replace(/^\/uploads\//, ''));
    await unlink(previous).catch(() => undefined);
  }

  private present(row: {
    id: string;
    type: ExportDocumentType;
    documentNumber: string;
    title: string | null;
    buyerName: string;
    buyerAddress: string | null;
    documentDate: Date;
    pdfUrl: string;
    createdAt: Date;
  }): ExportDocumentResponseDto {
    return {
      id: row.id,
      type: row.type,
      documentNumber: row.documentNumber,
      title: row.title,
      buyerName: row.buyerName,
      buyerAddress: row.buyerAddress,
      documentDate: row.documentDate.toISOString().slice(0, 10),
      pdfUrl: row.pdfUrl,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
