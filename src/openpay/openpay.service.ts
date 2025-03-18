import { Injectable } from '@nestjs/common';
import { delay } from '../constants';
import { db } from 'src/firebase/admin';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Injectable()
export class OpenpayService {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  async newChange(body: ChangeSuccess) {
    const openpay = await db
      .collection('openpay-transactions')
      .doc(body.transaction.id)
      .get();

    const batch = db.batch();

    if (body.type == 'payout.failed') {
      const user_ref = db.collection('users').doc(openpay.get('id_user'));
      batch.update(user_ref, {
        [`payment_link.status`]: 'failed',
      });

      await batch.commit();

      return 'FAILED';
    }
    if (body.type == 'charge.succeeded') {
      const user_ref = db.collection('users').doc(openpay.get('id_user'));

      batch.create(user_ref.collection('openpay-transactions').doc(), body);

      batch.update(user_ref, {
        [`payment_link.status`]: 'success',
      });

      if (openpay.get('type') == 'membership') {
        await this.subscriptionService.onPaymentMembership(
          openpay.get('id_user'),
          openpay.get('membership_type'),
          true,
        );
      }

      await batch.commit();

      return 'OK';
    }
    return 'FAIL';
  }
}
