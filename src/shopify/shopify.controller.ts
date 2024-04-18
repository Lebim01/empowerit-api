import { Body, Controller, Post } from '@nestjs/common';
import { PayloadNewShip } from './webhooks';

@Controller('shopify')
export class ShopifyController {
  @Post('newShip')
  newShip(@Body() body: PayloadNewShip) {
    const total_price = Number(body.total_price);
    const dollars = Math.ceil(total_price / 20);
    const binary_points = Math.round(dollars / 2);
    console.log({
      total_price,
      dollars,
      binary_points,
    });
    return 'OK';
  }
}
