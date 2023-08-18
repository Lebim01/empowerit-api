import { Module } from '@nestjs/common';
import { CryptoapisService } from './cryptoapis.service';
import { CryptoapisController } from './cryptoapis.controller';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Module({
  providers: [CryptoapisService],
  controllers: [CryptoapisController],
  imports: [SubscriptionsService],
})
export class CryptoapisModule {}
