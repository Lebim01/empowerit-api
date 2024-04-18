import { Body, Controller, Post } from '@nestjs/common';
import { PayloadNewShip } from './webhooks';

@Controller('shopify')
export class ShopifyController {
  @Post('newShip')
  newShip(@Body() body: PayloadNewShip) {
    const {
      billing_address,
      customer,
      discount_applications,
      fulfillments,
      line_items,
      payment_terms,
      refunds,
      shipping_address,
      shipping_lines,
      total_shipping_price_set,
      total_tax,
      total_tax_set,
      total_tip_received,
      total_weight,
      updated_at,
      user_id,
      ...rest
    } = body;
    console.log(rest);
    return 'OK';
  }
}
