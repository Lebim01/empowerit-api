import { Controller, Post } from '@nestjs/common';
import { ScriptsService } from './scripts.service';

@Controller('scripts')
export class ScriptsController {
  constructor(private scriptsService: ScriptsService) {}

  @Post('calculateStartAt')
  calculateStartAt() {
    return this.scriptsService.calculateStartAt();
  }
}
