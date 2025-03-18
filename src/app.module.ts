import { join } from 'path';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BondsModule } from './bonds/bonds.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ScriptsModule } from './scripts/scripts.module';
import { BinaryService } from './binary/binary.service';
import { UsersService } from './users/users.service';
import { UsersModule } from './users/users.module';
import { BinaryModule } from './binary/binary.module';
import { RanksModule } from './ranks/ranks.module';
import { RanksService } from './ranks/ranks.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AdminModule } from './admin/admin.module';
import { ReportModule } from './report/report.module';
import { LocationModule } from './location/location.module';
import { GoogletaskModule } from './googletask/googletask.module';
import { GoogletaskService } from './googletask/googletask.service';
import { CloudflareModule } from './cloudflare/cloudflare.module';
import { AcademyModule } from './academy/academy.module';
import { EmailModule } from './email/email.module';
import { OpenpayModule } from './openpay/openpay.module';
import { AlgorithmMrRangeModule } from './algorithm-mr-range/algorithm-mr-range.module';
import { BondsService } from './bonds/bonds.service';
import { SevenLevelsModule } from './seven-levels/seven-levels.module';
import { CoinpaymentsController } from './coinpayments/coinpayments.controller';
import { CoinpaymentsService } from './coinpayments/coinpayments.service';
import { CoinpaymentsModule } from './coinpayments/coinpayments.module';
import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { EmailService } from './email/email.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    BondsModule,
    SubscriptionsModule,
    ScriptsModule,
    UsersModule,
    BinaryModule,
    RanksModule,
    AdminModule,
    ReportModule,
    LocationModule,
    GoogletaskModule,
    CloudflareModule,
    AcademyModule,
    EmailModule,
    OpenpayModule,
    AlgorithmMrRangeModule,
    SevenLevelsModule,
    CoinpaymentsModule,
  ],
  controllers: [AppController, CoinpaymentsController],
  providers: [
    AppService,
    BinaryService,
    UsersService,
    RanksService,
    GoogletaskService,
    SubscriptionsService,
    BondsService,
    CoinpaymentsService,
    EmailService,
  ],
})
export class AppModule {}
