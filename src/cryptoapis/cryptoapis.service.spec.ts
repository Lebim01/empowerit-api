import { Test, TestingModule } from '@nestjs/testing';
import { CryptoapisService } from './cryptoapis.service';

describe('CryptoapisService', () => {
  let service: CryptoapisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoapisService],
    }).compile();

    service = module.get<CryptoapisService>(CryptoapisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
