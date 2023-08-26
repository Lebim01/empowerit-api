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

  @Post('assignNewSubscriptionsObject')
  assignNewSubscriptionsObject() {
    return this.scriptsService.assignNewSubscriptionsObject();
  }

  @Post('assingSaguineUsers')
  assingSaguineUsers() {
    return this.scriptsService.assingSanguineUsers();
  }

  @Post('assignLeftRightUsers')
  assignLeftRightUsers() {
    return this.scriptsService.assignLeftRightUsers();
  }

  @Post('removePoints')
  removePoints() {
    return this.scriptsService.deleteExpiredPoints();
  }

  @Post('deleteUsers')
  deleteUsers() {
    return this.scriptsService.deleteUsers();
  }
}
