import { Controller, Get, Param, Post } from '@nestjs/common';
import { RanksService } from './ranks.service';
@Controller('ranks')
export class RanksController {
  constructor(private ranksService: RanksService) {}

  @Post('updateRanks')
  upateRanks() {
    return this.ranksService.updateRank();
  }
  @Post('getRank/:idUser')
  async getRank(@Param('idUser') idUser: string) {
    return await this.ranksService.getRankUser(idUser);
  }
  @Post('getRankKey/:key')
  async getRankKey(@Param('key') key: string) {
    return await this.ranksService.getRankKey(key);
  }
}
