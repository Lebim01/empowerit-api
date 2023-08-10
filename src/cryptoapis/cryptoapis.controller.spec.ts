import { Test, TestingModule } from '@nestjs/testing';
import { CryptoapisController } from './cryptoapis.controller';

describe('CryptoapisController', () => {
  let controller: CryptoapisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CryptoapisController],
    }).compile();

    controller = module.get<CryptoapisController>(CryptoapisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
