import { Module } from '@nestjs/common';
import { BusinessController, LocationsController, MembersController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  controllers: [BusinessController, LocationsController, MembersController],
  providers: [BusinessesService],
})
export class BusinessesModule {}
