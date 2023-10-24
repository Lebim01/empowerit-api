import { Controller, Param, Post, Get, Query } from '@nestjs/common';
import { RanksService } from './ranks.service';
@Controller('ranks')
export class RanksController {
  constructor(private ranksService: RanksService) {}

  @Post('updateRanks')
  upateRanks() {
    return this.ranksService.updateRank();
  }

  @Post('updateUserRank/:id')
  updateUserRank(@Param('id') id_user: string) {
    return this.ranksService.updateUserRank(id_user);
  }

  @Post('getRank/:idUser')
  async getRank(@Param('idUser') idUser: string) {
    const is_report = true;
    return await this.ranksService.getRankUser(idUser, is_report);
  }
  @Post('getRankKey/:key')
  async getRankKey(@Param('key') key: string) {
    return await this.ranksService.getRankKey(key);
  }

  @Get('report/new-ranks/:year/:week')
  async reportNewRanks(
    @Param('year') year: string,
    @Param('week') week: string,
    @Query('type') type: 'json' | 'csv' = 'json',
  ) {
    return await this.ranksService.newRanks(year, week, type);
  }

  @Get('weeks')
  async weeks() {
    return this.ranksService.getWeeks(false);
  }
}
