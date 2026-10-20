import { Body, Controller, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { Actor } from '../common/actor';
import { CurrentActor, Roles } from '../common/decorators';
import { ConvertMaterialDto, ProductionDayQueryDto, SaveProductionDayDto } from './dto';
import { ProductionService } from './production.service';

@ApiTags('production')
@ApiBearerAuth()
@Controller('production')
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Get('day')
  @ApiOperation({
    summary: 'Today report: material with people, conversions, and qualities made.',
  })
  day(@CurrentActor() actor: Actor, @Query() query: ProductionDayQueryDto) {
    return this.production.day(actor, query);
  }

  @Post('convert')
  @HttpCode(200)
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.SUPERVISOR, MemberRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Convert with a worker: store 18/UP hank count, or cut to finished qualities.',
  })
  convert(@CurrentActor() actor: Actor, @Body() dto: ConvertMaterialDto) {
    return this.production.convert(actor, dto);
  }

  @Put('day')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.SUPERVISOR, MemberRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Save the day production sheet: qualities made by each person.' })
  saveDay(@CurrentActor() actor: Actor, @Body() dto: SaveProductionDayDto) {
    return this.production.saveDay(actor, dto);
  }
}
