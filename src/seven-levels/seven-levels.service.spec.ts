import { Test, TestingModule } from '@nestjs/testing';
import { SevenLevelsService } from './seven-levels.service';

describe('SevenLevelsService', () => {
  let service: SevenLevelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SevenLevelsService],
    }).compile();

    service = module.get<SevenLevelsService>(SevenLevelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
