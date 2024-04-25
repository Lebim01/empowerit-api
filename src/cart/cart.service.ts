import { Injectable } from '@nestjs/common';
import { CryptoapisService } from 'src/cryptoapis/cryptoapis.service';
import { db as admin } from '../firebase/admin';

@Injectable()
export class CartService {
  constructor(private readonly cryptoapisService: CryptoapisService) {}

  async getPaymentLink(user_id: string) {
    const cart = await admin
      .collection('users')
      .doc(user_id)
      .collection('cart')
      .doc('1')
      .get();

    if (cart.exists) {
      let address = '';
      if (!cart.get('payment_link.address')) {
        const newAddress = await this.cryptoapisService.createNewWalletAddress(
          'LTC',
        );
        address = newAddress;
      } else {
        address = cart.get('payment_link.address');
      }

      const products = JSON.parse(cart.get('json'));
      const total_quantity = products.reduce((a, b) => a + b.quantity, 0);
      const total_mxn = products.reduce(
        (a, b) => a + (b.quantity > 0 ? b.quantity * b.sale_price : 0),
        0,
      );
      const exchange_rate = await this.cryptoapisService.getUSDExchange();
      const total_usd = total_mxn / exchange_rate;
      const subtotal = await this.cryptoapisService.getLTCExchange(total_usd);
      const shipping_price_mxn =
        total_quantity >= 22 ? 600 : total_quantity >= 10 ? 300 : 200;
      const shipping_price_usd = shipping_price_mxn / exchange_rate;
      const total = shipping_price_usd + subtotal;

      const qr: string = this.cryptoapisService.generateQrUrl(
        address,
        total.toString(),
        'litecoin',
      );
      const payment_link = {
        amount: total,
        total_mxn,
        total_usd,
        qr,
        shipping_price_mxn,
        shipping_price_usd,
        address,
        exchange_rate,
        status: 'pending',
      };

      await cart.ref.update({
        payment_link,
        updated_at: new Date(),
      });

      await this.cryptoapisService.createFirstConfirmationCartTransaction(
        user_id,
        address,
      );

      return payment_link;
    }

    return null;
  }
}
