import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor, Public, Roles } from '../common/decorators';
import {
  PublicCompanySiteDto,
  PublicSiteEditorDto,
  PublicSiteIndexDto,
  UpdatePublicSiteDto,
} from './dto';
import { PublicSiteService } from './public-site.service';

function fileUpload() {
  return FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 6 * 1024 * 1024 },
  });
}

@ApiTags('public-site')
@Controller()
export class PublicSiteController {
  constructor(private readonly publicSite: PublicSiteService) {}

  @ApiBearerAuth()
  @Get('business/public-site')
  @ApiOperation({ summary: 'Get public website editor state for the current business.' })
  @ApiData(PublicSiteEditorDto)
  getEditor(@CurrentActor() actor: Actor) {
    return this.publicSite.getEditor(actor);
  }

  @ApiBearerAuth()
  @Put('business/public-site')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Update and publish the public company website.' })
  @ApiData(PublicSiteEditorDto)
  updateEditor(@CurrentActor() actor: Actor, @Body() dto: UpdatePublicSiteDto) {
    return this.publicSite.updateEditor(actor, dto);
  }

  @ApiBearerAuth()
  @Post('business/public-site/cover')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Upload the public website cover image (min 1600×900).' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiData(PublicSiteEditorDto)
  @UseInterceptors(fileUpload())
  uploadCover(
    @CurrentActor() actor: Actor,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.publicSite.uploadCover(actor, file);
  }

  @ApiBearerAuth()
  @Delete('business/public-site/cover')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Remove the public website cover image.' })
  @ApiData(PublicSiteEditorDto)
  removeCover(@CurrentActor() actor: Actor) {
    return this.publicSite.removeCover(actor);
  }

  @ApiBearerAuth()
  @Post('business/public-site/logo')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Upload the company logo (128–800 px).' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiData(PublicSiteEditorDto)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadLogo(
    @CurrentActor() actor: Actor,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.publicSite.uploadLogo(actor, file);
  }

  @ApiBearerAuth()
  @Delete('business/public-site/logo')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Remove the company logo.' })
  @ApiData(PublicSiteEditorDto)
  removeLogo(@CurrentActor() actor: Actor) {
    return this.publicSite.removeLogo(actor);
  }

  @ApiBearerAuth()
  @Post('business/public-site/gallery')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Upload a gallery image (min 800×600, max 12).' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiData(PublicSiteEditorDto)
  @UseInterceptors(fileUpload())
  uploadGallery(
    @CurrentActor() actor: Actor,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.publicSite.uploadGalleryImage(actor, file);
  }

  @ApiBearerAuth()
  @Delete('business/public-site/gallery')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Remove a gallery image by URL.' })
  @ApiData(PublicSiteEditorDto)
  removeGallery(@CurrentActor() actor: Actor, @Query('url') url: string) {
    return this.publicSite.removeGalleryImage(actor, url);
  }

  @Public()
  @Get('public/sites')
  @ApiOperation({ summary: 'Index of published public company websites (for sitemap/SEO).' })
  @ApiDataArray(PublicSiteIndexDto)
  listPublished() {
    return this.publicSite.listPublishedSites();
  }

  @Public()
  @Get('public/sites/:slug')
  @ApiOperation({ summary: 'Public company website (published only).' })
  @ApiData(PublicCompanySiteDto)
  getPublic(@Param('slug') slug: string) {
    return this.publicSite.getPublicBySlug(slug);
  }
}
