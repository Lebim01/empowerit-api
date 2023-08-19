import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CryptoapisModule } from './cryptoapis/cryptoapis.module';
import { BondsModule } from './bonds/bonds.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ConfigModule } from '@nestjs/config';
import { ScholarshipModule } from './scholarship/scholarship.module';
import { ScriptsModule } from './scripts/scripts.module';
import { RanksModule } from './ranks/ranks.module';

@Module({
  imports: [
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
    RanksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
