import { Test, TestingModule } from '@nestjs/testing';
import { AlgorithmMrRangeService } from './algorithm-mr-range.service';

describe('AlgorithmMrRangeService', () => {
  let service: AlgorithmMrRangeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlgorithmMrRangeService],
    }).compile();

    service = module.get<AlgorithmMrRangeService>(AlgorithmMrRangeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
