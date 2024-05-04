import { Module } from '@nestjs/common';
import { OpenpayController } from './openpay.controller';
import { OpenpayService } from './openpay.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Module({
  controllers: [OpenpayController],
  providers: [OpenpayService, SubscriptionsService],
})
export class OpenpayModule {}
