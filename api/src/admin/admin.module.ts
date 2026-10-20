import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SetupRequestsModule } from '../setup-requests/setup-requests.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CampaignsService } from './campaigns.service';
import { ProspectsService } from './prospects.service';

@Module({
  imports: [AuthModule, SetupRequestsModule],
  controllers: [AdminController],
  providers: [AdminService, ProspectsService, CampaignsService],
})
export class AdminModule {}
