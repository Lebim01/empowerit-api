import { Module } from '@nestjs/common';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { ParticipationsController } from './participations.controller';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { UsersService } from 'src/users/users.service';
import { CryptoapisService } from 'src/cryptoapis/cryptoapis.service';
import { GoogletaskService } from 'src/googletask/googletask.service';
import { ShopifyService } from 'src/shopify/shopify.service';
import { EmailService } from 'src/email/email.service';
import { ParticipationsService } from './participations.service';

@Module({
  providers: [
    SubscriptionsService,
    BinaryService,
    BondsService,
    UsersService,
    CryptoapisService,
    GoogletaskService,
    ShopifyService,
    EmailService,
    ParticipationsService,
  ],
  controllers: [ParticipationsController],
  imports: [],
})
export class ParticipationsModule {}
