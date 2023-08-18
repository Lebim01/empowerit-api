import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';

@Module({
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
  imports: [BinaryService, BondsService],
})
export class SubscriptionsModule {}
