import { Controller, Get, Param, Post } from '@nestjs/common';
import { RanksService } from './ranks.service';
@Controller('ranks')
export class RanksController {
  constructor(private ranksService: RanksService) {}

  @Get('updateRanks')
  upateRanks() {
    return this.ranksService.updateRank();
  }
  @Post('getRank/:idUser')
  async getRank(@Param('idUser') idUser: string) {
    return await this.ranksService.getRankUser(idUser);
  }
}
