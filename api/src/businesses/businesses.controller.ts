import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { Actor } from '../common/actor';
import { ApiData, ApiDataArray } from '../common/api-docs';
import { CurrentActor, Roles } from '../common/decorators';
import { BusinessesService } from './businesses.service';
import {
  BusinessDetailDto,
  BusinessResponseDto,
  CreateLocationDto,
  CreateMemberDto,
  LocationResponseDto,
  MemberResponseDto,
  UpdateBusinessDto,
  UpdateLocationDto,
  UpdateMemberDto,
} from './dto';

@ApiTags('business')
@ApiBearerAuth()
@Controller('business')
export class BusinessController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  @ApiOperation({ summary: 'The current business and a few counts.' })
  @ApiData(BusinessDetailDto)
  get(@CurrentActor() actor: Actor) {
    return this.businesses.get(actor);
  }

  @Patch()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Update the business profile. A business may keep several activities.' })
  @ApiData(BusinessResponseDto)
  update(@CurrentActor() actor: Actor, @Body() dto: UpdateBusinessDto) {
    return this.businesses.update(actor, dto);
  }
}

@ApiTags('locations')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  @ApiOperation({ summary: 'Processing places, branches, warehouses, and owned cold stores.' })
  @ApiDataArray(LocationResponseDto)
  list(@CurrentActor() actor: Actor) {
    return this.businesses.listLocations(actor);
  }

  @Post()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Add a place.' })
  @ApiData(LocationResponseDto, 201)
  create(@CurrentActor() actor: Actor, @Body() dto: CreateLocationDto) {
    return this.businesses.createLocation(actor, dto);
  }

  @Patch(':id')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Rename a place, change its kind, or mark it inactive.' })
  @ApiData(LocationResponseDto)
  update(
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.businesses.updateLocation(actor, id, dto);
  }
}

@ApiTags('members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  @ApiOperation({ summary: 'People who can sign in to this business, with their roles.' })
  @ApiDataArray(MemberResponseDto)
  list(@CurrentActor() actor: Actor) {
    return this.businesses.listMembers(actor);
  }

  @Post()
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Add a person. An existing CasingConnect email joins this business without a new password.' })
  @ApiData(MemberResponseDto, 201)
  create(@CurrentActor() actor: Actor, @Body() dto: CreateMemberDto) {
    return this.businesses.createMember(actor, dto);
  }

  @Patch(':id')
  @Roles(MemberRole.OWNER, MemberRole.MANAGER)
  @ApiOperation({ summary: 'Change a role, title, or access. The last active owner stays in place.' })
  @ApiData(MemberResponseDto)
  update(
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.businesses.updateMember(actor, id, dto);
  }
}
