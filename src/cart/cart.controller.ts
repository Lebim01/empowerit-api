import { Body, Controller, Post } from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('/pay')
  pay(@Body() body) {
    if (!body.id_user) throw new Error('User is required');
    return this.cartService.getPaymentLink(body.id_user);
  }
}
