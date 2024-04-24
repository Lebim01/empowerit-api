import { Body, Controller, Post } from '@nestjs/common';
import { PayloadNewShip } from './webhooks';
import { BinaryService } from 'src/binary/binary.service';
import { db } from 'src/firebase/admin';

@Controller('shopify')
export class ShopifyController {
  constructor(private readonly binaryService: BinaryService) {}

  @Post('newShip')
  async newShip(@Body() body: PayloadNewShip) {
    await db.collection('shopify-ships').add(body);

    const user = await db
      .collection('users')
      .where('email', '==', body.customer.email)
      .get()
      .then((r) => r.docs[0]);

    if (user.exists) {
      const total_price = Number(body.total_price);
      const dollars = Math.ceil(total_price / 20);
      const binary_points = Math.round(dollars / 2);
      console.log({
        total_price,
        dollars,
        binary_points,
      });
      await this.binaryService.increaseBinaryPoints(
        user.id,
        binary_points,
        'Compra de productos',
      );
    } else {
      console.error('Usuario no existe');
      return 'FAIL';
    }
    return 'OK';
  }
}
