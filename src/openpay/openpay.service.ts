import { Injectable } from '@nestjs/common';
import { delay } from '../constants';
import { db } from 'src/firebase/admin';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Injectable()
export class OpenpayService {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  async newChange(body: ChangeSuccess) {
    if (body.type == 'payout.failed') {
      const users = await db
        .collection('users')
        .where('email', '==', body.transaction.customer.email)
        .get();

      if (!users.empty) {
        const user = users.docs[0];
        const payment_link = user.get('payment_link');
        const membership = Object.keys(payment_link)[0] as Franchises;

        await user.ref.update({
          [`payment_link.${membership}.status`]: 'failed',
        });

        return 'FAILED';
      }
    }
    if (body.type == 'charge.succeeded') {
      const users = await db
        .collection('users')
        .where('email', '==', body.transaction.customer.email)
        .get();

      if (!users.empty) {
        const user = users.docs[0];
        await user.ref.collection('openpay-transactions').add(body);

        const payment_link = user.get('payment_link');
        const membership = Object.keys(payment_link)[0] as Franchises;
        const period = payment_link[membership].membership_period || 'monthly';
        await user.ref.update({
          [`payment_link.${membership}.status`]: 'success',
        });

        await delay(500);
        await this.subscriptionService.onPaymentMembership(user.id, membership,'FIAT (MXN)',"Activada con Pago");

        return 'OK';
      }
    }

    return 'FAIL';
  }
}
