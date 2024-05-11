import { Body, Controller, Post } from '@nestjs/common';
import { CartService } from './cart.service';
import { db } from 'src/firebase/admin';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('/pay')
  pay(@Body() body) {
    if (!body.id_user) throw new Error('User is required');
    return this.cartService.getPaymentLink(body.id_user);
  }

  @Post('fix')
  async fix() {
    const points = await db
      .collectionGroup('right-points')
      .where('user_id', '==', 'IOWwTlVPjSOmZAwTvsgFHoBShBE3')
      .get();
    return points.docs.map((r) => r.data());
  }
}
