import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor, Roles } from '../common/decorators';
import { AvailableQualityDto, CreateSaleDto, SaleResponseDto } from './dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get('available')
  @ApiOperation({ summary: 'Finished qualities available to sell (produced minus already sold).' })
  @ApiDataArray(AvailableQualityDto)
  available(@CurrentActor() actor: Actor) {
    return this.sales.available(actor);
  }

  @Get()
  @ApiOperation({ summary: 'Recent sales of finished qualities.' })
  @ApiDataArray(SaleResponseDto)
  list(@CurrentActor() actor: Actor) {
    return this.sales.list(actor);
  }

  @Post()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER, MemberRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Record a sale of a produced quality to a customer.' })
  @ApiData(SaleResponseDto, 201)
  create(@CurrentActor() actor: Actor, @Body() dto: CreateSaleDto) {
    return this.sales.create(actor, dto);
  }
}
