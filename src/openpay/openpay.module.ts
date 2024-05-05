import { Module } from '@nestjs/common';
import { OpenpayController } from './openpay.controller';
import { OpenpayService } from './openpay.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { CryptoapisService } from 'src/cryptoapis/cryptoapis.service';
import { GoogletaskService } from 'src/googletask/googletask.service';
import { ShopifyService } from 'src/shopify/shopify.service';
import { UsersService } from 'src/users/users.service';

@Module({
  controllers: [OpenpayController],
  providers: [
    OpenpayService,
    SubscriptionsService,
    BinaryService,
    BondsService,
    CryptoapisService,
    GoogletaskService,
    ShopifyService,
    UsersService,
  ],
})
export class OpenpayModule {}
