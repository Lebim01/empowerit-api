import { Test, TestingModule } from '@nestjs/testing';
import { CoinpaymentsController } from './coinpayments.controller';

describe('CoinpaymentsController', () => {
  let controller: CoinpaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoinpaymentsController],
    }).compile();

    controller = module.get<CoinpaymentsController>(CoinpaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
