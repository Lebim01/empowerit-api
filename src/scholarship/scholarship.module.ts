import { Module } from '@nestjs/common';
import { ScholarshipService } from './scholarship.service';
import { ScholarshipController } from './scholarship.controller';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { BinaryService } from 'src/binary/binary.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Module({
  providers: [
    ScholarshipService,
    BondsService,
    UsersService,
    BinaryService,
    SubscriptionsService,
  ],
  controllers: [ScholarshipController],
})
export class ScholarshipModule {}
