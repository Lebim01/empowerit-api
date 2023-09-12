import { Test, TestingModule } from '@nestjs/testing';
import { GoogletaskService } from './googletask.service';

describe('GoogletaskService', () => {
  let service: GoogletaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogletaskService],
    }).compile();

    service = module.get<GoogletaskService>(GoogletaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
