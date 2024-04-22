import { Controller, Param, Post, Get, Query, Body } from '@nestjs/common';
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
    return await this.ranksService.getRankUser(idUser);
  }

  @Post('getRankKey/:key')
  async getRankKey(@Body() body, @Param('key') key: string) {
    if (!body.id_user) throw new Error('id_user is required');
    return await this.ranksService.getRankKey(body.id_user, key);
  }

  @Get('report/new-ranks/:year/:week')
  async reportNewRanks(
    @Param('year') year: string,
    @Param('week') week: string,
    @Query('type') type: 'json' | 'csv' = 'json',
  ) {
    return await this.ranksService.newRanks(year, week, type);
  }
}
