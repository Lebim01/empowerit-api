import { Test, TestingModule } from '@nestjs/testing';
import { OpenpayService } from './openpay.service';

describe('OpenpayService', () => {
  let service: OpenpayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenpayService],
    }).compile();

    service = module.get<OpenpayService>(OpenpayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
