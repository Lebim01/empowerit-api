import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CryptoapisModule } from './cryptoapis/cryptoapis.module';
import { BondsModule } from './bonds/bonds.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [CryptoapisModule, BondsModule, SubscriptionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
