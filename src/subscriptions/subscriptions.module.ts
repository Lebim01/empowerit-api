import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { UsersService } from 'src/users/users.service';

@Module({
  providers: [SubscriptionsService, BinaryService, BondsService, UsersService],
  controllers: [SubscriptionsController],
  imports: [],
})
export class SubscriptionsModule {}
