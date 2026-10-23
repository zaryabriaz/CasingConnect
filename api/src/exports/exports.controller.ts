import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor, Roles } from '../common/decorators';
import {
  CreateExportDocumentDto,
  ExportDocumentResponseDto,
  ExportLetterheadDto,
} from './dto';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get('letterhead')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Get export letterhead settings for the current business.' })
  @ApiData(ExportLetterheadDto)
  getLetterhead(@CurrentActor() actor: Actor) {
    return this.exports.getLetterhead(actor);
  }

  @Post('letterhead')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Upload company letterhead image for export PDFs.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiData(ExportLetterheadDto)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadLetterhead(
    @CurrentActor() actor: Actor,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.exports.uploadLetterhead(actor, file);
  }

  @Delete('letterhead')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Remove the export letterhead image.' })
  @ApiData(ExportLetterheadDto)
  removeLetterhead(@CurrentActor() actor: Actor) {
    return this.exports.removeLetterhead(actor);
  }

  @Get('documents')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'List recent generated export documents.' })
  @ApiDataArray(ExportDocumentResponseDto)
  listDocuments(@CurrentActor() actor: Actor) {
    return this.exports.listDocuments(actor);
  }

  @Post('documents')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Generate a Commercial Invoice or Packing List PDF on letterhead.' })
  @ApiData(ExportDocumentResponseDto, 201)
  createDocument(@CurrentActor() actor: Actor, @Body() dto: CreateExportDocumentDto) {
    return this.exports.createDocument(actor, dto);
  }

  @Get('documents/:id/pdf')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Download a generated export PDF.' })
  async downloadPdf(
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.exports.getDocumentPdfPath(actor, id);
    if (!existsSync(file.absolute)) {
      throw new NotFoundException('PDF file missing on disk.');
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${file.filename.replace(/"/g, '')}"`,
    });
    return new StreamableFile(createReadStream(file.absolute));
  }
}
