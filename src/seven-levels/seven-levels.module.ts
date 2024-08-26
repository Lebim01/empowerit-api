import { Module } from '@nestjs/common';
import { SevenLevelsService } from './seven-levels.service';
import { SevenLevelsController } from './seven-levels.controller';

@Module({
  providers: [SevenLevelsService],
  controllers: [SevenLevelsController]
})
export class SevenLevelsModule {}
