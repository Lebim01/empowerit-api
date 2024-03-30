import { Module } from '@nestjs/common';
import { CryptoapisService } from './cryptoapis.service';
import { CryptoapisController } from './cryptoapis.controller';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { UsersService } from 'src/users/users.service';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { GoogletaskService } from 'src/googletask/googletask.service';

@Module({
  providers: [
    CryptoapisService,
    SubscriptionsService,
    UsersService,
    BinaryService,
    BondsService,
    GoogletaskService,
  ],
  controllers: [CryptoapisController],
})
export class CryptoapisModule {}
