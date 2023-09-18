import { Module } from '@nestjs/common';
import { RanksService } from './ranks.service';
import { RanksController } from './ranks.controller';
import { GoogletaskService } from '../googletask/googletask.service';

@Module({
  providers: [RanksService, GoogletaskService],
  controllers: [RanksController],
})
export class RanksModule {}
