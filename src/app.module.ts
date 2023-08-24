import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CryptoapisModule } from './cryptoapis/cryptoapis.module';
import { BondsModule } from './bonds/bonds.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ConfigModule } from '@nestjs/config';
import { ScholarshipModule } from './scholarship/scholarship.module';
import { ScriptsModule } from './scripts/scripts.module';
import { BinaryService } from './binary/binary.service';
import { UsersService } from './users/users.service';
import { UsersModule } from './users/users.module';
import { BinaryModule } from './binary/binary.module';

import { RanksModule } from './ranks/ranks.module';
import { RanksService } from './ranks/ranks.service';
import { SentryModule } from '@ntegral/nestjs-sentry';

@Module({
  imports: [
    SentryModule.forRoot({
      dsn: 'https://84117b0558246fc197f3ffdb42db404e@o4505757456334848.ingest.sentry.io/4505757458366464',
      debug: process.env.SENTRY_ENV && process.env.SENTRY_ENV != 'local',
      environment: process.env.SENTRY_ENV,
      logLevels: ['debug'],
    }),
    CryptoapisModule,
    BondsModule,
    SubscriptionsModule,
    ScholarshipModule,
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.development',
    }),
    ScriptsModule,
    UsersModule,
    BinaryModule,
    RanksModule,
  ],
  controllers: [AppController],
  providers: [AppService, BinaryService, UsersService, RanksService],
})
export class AppModule {}
