import { Module } from '@nestjs/common';
import { SetupRequestsController } from './setup-requests.controller';
import { SetupRequestsService } from './setup-requests.service';

@Module({
  controllers: [SetupRequestsController],
  providers: [SetupRequestsService],
  exports: [SetupRequestsService],
})
export class SetupRequestsModule {}
