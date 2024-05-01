import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ScriptsService } from './scripts.service';

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
    setTimeout(() => {
      // nada
    }, 1000 * 60 * 5);
  }
}
