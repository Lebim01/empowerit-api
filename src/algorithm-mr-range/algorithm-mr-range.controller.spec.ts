import { Test, TestingModule } from '@nestjs/testing';
import { AlgorithmMrRangeController } from './algorithm-mr-range.controller';

describe('AlgorithmMrRangeController', () => {
  let controller: AlgorithmMrRangeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlgorithmMrRangeController],
    }).compile();

    controller = module.get<AlgorithmMrRangeController>(AlgorithmMrRangeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
