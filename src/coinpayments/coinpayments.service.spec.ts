import { Test, TestingModule } from '@nestjs/testing';
import { CoinpaymentsService } from './coinpayments.service';

describe('CoinpaymentsService', () => {
  let service: CoinpaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoinpaymentsService],
    }).compile();

    service = module.get<CoinpaymentsService>(CoinpaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
