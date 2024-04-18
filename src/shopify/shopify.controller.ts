import { Body, Controller, Post } from '@nestjs/common';

@Controller('shopify')
export class ShopifyController {
  @Post('newShip')
  newShip(@Body() body) {
    console.log(body);
    return 'OK';
  }
}
