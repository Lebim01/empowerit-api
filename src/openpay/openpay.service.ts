import { Injectable } from '@nestjs/common';
import { db } from 'src/firebase/admin';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Injectable()
export class OpenpayService {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  async newChange(body: ChangeSuccess) {
    const users = await db
      .collection('users')
      .where('email', '==', body.transaction.customer.email)
      .get();

    if (!users.empty) {
      const user = users.docs[0];
      await user.ref.collection('openpay-transactions').add(body);

      const payment_link = user.get('payment_link');
      const membership = Object.keys(payment_link)[0] as Memberships;
      const period = payment_link[membership].membership_period || 'monthly';
      await this.subscriptionService.onPaymentMembership(
        user.id,
        membership,
        period,
      );

      return 'OK';
    }

    return 'FAIL';
  }
}
