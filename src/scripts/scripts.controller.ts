import { Body, Controller, Param, Post } from '@nestjs/common';
import { ScriptsService } from './scripts.service';

@Controller('scripts')
export class ScriptsController {
  constructor(private scriptsService: ScriptsService) {}

  @Post('calculateStartAt')
  calculateStartAt() {
    return this.scriptsService.calculateStartAt();
  }

  @Post('duplicateUserDoc/:uid')
  duplicateUserDoc(
    @Param('uid') userDocID: string,
    @Body('new_id') newId: string,
  ) {
    return this.scriptsService.duplicateUserDoc(userDocID, newId);
  }

  @Post('assignInitialRank')
  assignInitialRank() {
    return this.scriptsService.assignInitialRank();
  }
}
