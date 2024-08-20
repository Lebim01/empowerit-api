import { Body, Controller, Post } from '@nestjs/common';
import { BondsService } from './bonds.service';

@Controller('bonds')
export class BondsController {
  constructor(private readonly bondsService: BondsService) {}

  @Post('pay-direct-sale')
  async payDirectSale(@Body() body) {
    return this.bondsService.execUserDirectBond(
      body.registerUserId,
      body.membership_price,
      true,
    );
  }

  @Post('pay-presenter')
  async payPresenter(@Body() body) {
    if (!body.registerUserId) throw new Error('registerUserId is required');
    if (!body.presenterId) throw new Error('presenterId is required');
    if (!body.total) throw new Error('total is required');

    return this.bondsService.execPresenterBonus(
      body.registerUserId,
      body.presenterId,
      body.total,
    );
  }
}
