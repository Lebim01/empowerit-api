import { Module } from '@nestjs/common';
import { AlgorithmMrRangeController } from './algorithm-mr-range.controller';
import { AlgorithmMrRangeService } from './algorithm-mr-range.service';

@Module({
  controllers: [AlgorithmMrRangeController],
  providers: [AlgorithmMrRangeService]
})
export class AlgorithmMrRangeModule {}
