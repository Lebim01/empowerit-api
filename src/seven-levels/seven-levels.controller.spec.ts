import { Test, TestingModule } from '@nestjs/testing';
import { SevenLevelsController } from './seven-levels.controller';

describe('SevenLevelsController', () => {
  let controller: SevenLevelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SevenLevelsController],
    }).compile();

    controller = module.get<SevenLevelsController>(SevenLevelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
