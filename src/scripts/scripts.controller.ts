import { Controller, Get, Post } from '@nestjs/common';
import { ScriptsService } from './scripts.service';

const _testTimeout = () => {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000 * 60 * 5);
  });
};

@Controller('scripts')
export class ScriptsController {
  constructor(private scriptsService: ScriptsService) {}

  @Post('removePoints')
  removePoints() {
    return this.scriptsService.deleteExpiredPoints();
  }

  @Get('repeatPayroll')
  repeatPayroll() {
    return this.scriptsService.getDuplicatedPayroll();
  }

  @Get('testTimeout')
  testTimeout() {
    return _testTimeout();
  }
}
