import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor, Roles } from '../common/decorators';
import { CatalogService } from './catalog.service';
import {
  CasingTypeResponseDto,
  CreateCasingTypeDto,
  CreateMaterialCategoryDto,
  CreateQualityDto,
  CreateUnitDto,
  MaterialCategoryResponseDto,
  QualityResponseDto,
  UnitResponseDto,
  UpdateCasingTypeDto,
  UpdateMaterialCategoryDto,
  UpdateQualityDto,
  UpdateUnitDto,
} from './dto';

@ApiTags('catalogue')
@ApiBearerAuth()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('casing-types')
  @ApiOperation({ summary: 'Casing types and their qualities for the current business.' })
  @ApiDataArray(CasingTypeResponseDto)
  listTypes(@CurrentActor() actor: Actor) {
    return this.catalog.listCasingTypes(actor);
  }

  @Post('casing-types')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Add a casing type. Built-in sheep and beef come from registration; add more types as needed.' })
  @ApiData(CasingTypeResponseDto, 201)
  createType(@CurrentActor() actor: Actor, @Body() dto: CreateCasingTypeDto) {
    return this.catalog.createCasingType(actor, dto);
  }

  @Patch('casing-types/:id')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Rename a casing type or enable and disable it.' })
  @ApiData(CasingTypeResponseDto)
  updateType(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCasingTypeDto) {
    return this.catalog.updateCasingType(actor, id, dto);
  }

  @Post('casing-types/:id/qualities')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({
    summary:
      'Add qualities. Enter a diameter (e.g. 26/28) to create AB, A, and C; or enter a full name like 26/28 AB for one grade.',
  })
  @ApiDataArray(QualityResponseDto)
  createQuality(
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQualityDto,
  ) {
    return this.catalog.createQuality(actor, id, dto);
  }

  @Patch('qualities/:id')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Rename, reorder, or disable a quality.' })
  @ApiData(QualityResponseDto)
  updateQuality(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQualityDto) {
    return this.catalog.updateQuality(actor, id, dto);
  }

  @Delete('qualities/:id')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({
    summary: 'Delete a quality that has never been used in production or sales. Otherwise turn it off.',
  })
  deleteQuality(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteQuality(actor, id);
  }

  @Get('units')
  @ApiOperation({ summary: 'Units of measure. Yield is comparable only inside the same group.' })
  @ApiDataArray(UnitResponseDto)
  listUnits(@CurrentActor() actor: Actor) {
    return this.catalog.listUnits(actor);
  }

  @Post('units')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Add a unit.' })
  @ApiData(UnitResponseDto, 201)
  createUnit(@CurrentActor() actor: Actor, @Body() dto: CreateUnitDto) {
    return this.catalog.createUnit(actor, dto);
  }

  @Patch('units/:id')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Rename a unit or change the group used for yield comparison.' })
  @ApiData(UnitResponseDto)
  updateUnit(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto) {
    return this.catalog.updateUnit(actor, id, dto);
  }

  @Get('material-categories')
  @ApiOperation({
    summary: 'Buying material categories (Roda, 18/UP, Quality, plus any custom categories).',
  })
  @ApiDataArray(MaterialCategoryResponseDto)
  listMaterialCategories(@CurrentActor() actor: Actor) {
    return this.catalog.listMaterialCategories(actor);
  }

  @Post('material-categories')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Add a custom material category for buying and stock.' })
  @ApiData(MaterialCategoryResponseDto, 201)
  createMaterialCategory(@CurrentActor() actor: Actor, @Body() dto: CreateMaterialCategoryDto) {
    return this.catalog.createMaterialCategory(actor, dto);
  }

  @Patch('material-categories/:id')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Rename, reorder, or enable/disable a material category.' })
  @ApiData(MaterialCategoryResponseDto)
  updateMaterialCategory(
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialCategoryDto,
  ) {
    return this.catalog.updateMaterialCategory(actor, id, dto);
  }

  @Delete('material-categories/:id')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({
    summary: 'Delete an unused custom category. Built-in categories can only be turned off.',
  })
  deleteMaterialCategory(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteMaterialCategory(actor, id);
  }
}
