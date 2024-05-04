import { Test, TestingModule } from '@nestjs/testing';
import { OpenpayController } from './openpay.controller';

describe('OpenpayController', () => {
  let controller: OpenpayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenpayController],
    }).compile();

    controller = module.get<OpenpayController>(OpenpayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
