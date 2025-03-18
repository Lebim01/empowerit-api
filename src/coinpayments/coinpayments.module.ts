import { Module } from '@nestjs/common';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { CoinpaymentsController } from './coinpayments.controller';
import { CoinpaymentsService } from './coinpayments.service';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { UsersService } from 'src/users/users.service';
import { GoogletaskService } from 'src/googletask/googletask.service';
import { EmailService } from 'src/email/email.service';

@Module({
  providers: [
    SubscriptionsService,
    BinaryService,
    BondsService,
    UsersService,
    GoogletaskService,
    EmailService,
    CoinpaymentsService,
  ],
  controllers: [CoinpaymentsController],
  imports: [],
})
export class CoinpaymentsModule {}
