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
    );
  }
}
