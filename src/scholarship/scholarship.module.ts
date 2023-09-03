import { Module } from '@nestjs/common';
import { ScholarshipService } from './scholarship.service';
import { ScholarshipController } from './scholarship.controller';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';

@Module({
  providers: [ScholarshipService, BondsService, UsersService],
  controllers: [ScholarshipController],
})
export class ScholarshipModule {}
