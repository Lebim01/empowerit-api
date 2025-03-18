import { Module } from '@nestjs/common';
import { RanksService } from './ranks.service';
import { RanksController } from './ranks.controller';
import { GoogletaskService } from '../googletask/googletask.service';
import { BondsService } from 'src/bonds/bonds.service';
import { UsersService } from 'src/users/users.service';

@Module({
  providers: [RanksService, GoogletaskService, BondsService, UsersService],
  controllers: [RanksController],
})
export class RanksModule {}
