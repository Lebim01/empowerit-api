import { Module, HttpException } from '@nestjs/common';
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
    UsersModule,
    BinaryModule,
    RanksModule,
  ],
  controllers: [AppController],
  providers: [AppService, BinaryService, UsersService, RanksService],
})
export class AppModule {}
