import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { UsersService } from 'src/users/users.service';
import { CryptoapisService } from 'src/cryptoapis/cryptoapis.service';
import { GoogletaskService } from 'src/googletask/googletask.service';
import { ShopifyService } from 'src/shopify/shopify.service';

@Module({
  providers: [
    SubscriptionsService,
    BinaryService,
    BondsService,
    UsersService,
    CryptoapisService,
    GoogletaskService,
    ShopifyService,
  ],
  controllers: [SubscriptionsController],
  imports: [],
})
export class SubscriptionsModule {}
