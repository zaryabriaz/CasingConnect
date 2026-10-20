import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BusinessesModule } from './businesses/businesses.module';
import { CaptchaModule } from './captcha/captcha.module';
import { CatalogModule } from './catalog/catalog.module';
import { MailModule } from './mail/mail.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ResponseInterceptor } from './common/response.interceptor';
import { AppValidationPipe } from './common/validation.pipe';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FinanceModule } from './finance/finance.module';
import { HealthController } from './health.controller';
import { LedgerModule } from './ledger/ledger.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PartnersModule } from './partners/partners.module';
import { ProductionModule } from './production/production.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { PrismaModule } from './prisma/prisma.module';
import { SalesModule } from './sales/sales.module';
import { PublicSiteModule } from './public-site/public-site.module';
import { SetupRequestsModule } from './setup-requests/setup-requests.module';
import { StockModule } from './stock/stock.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CaptchaModule,
    MailModule,
    PrismaModule,
    AuthModule,
    AdminModule,
    BusinessesModule,
    CatalogModule,
    PartnersModule,
    ReceiptsModule,
    SalesModule,
    ExpensesModule,
    LedgerModule,
    FinanceModule,
    DashboardModule,
    StockModule,
    ProductionModule,
    MarketplaceModule,
    SetupRequestsModule,
    PublicSiteModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_PIPE, useClass: AppValidationPipe },
  ],
})
export class AppModule {}
