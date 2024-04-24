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
      const total_mxn = products.reduce(
        (a, b) => a + b.quantity * b.sale_price,
        0,
      );
      const exchange_rate = await this.cryptoapisService.getUSDExchange(
        total_mxn,
      );
      const total_usd = total_mxn / exchange_rate;
      const total = await this.cryptoapisService.getLTCExchange(total_usd);

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
        address,
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
