import { Injectable } from '@nestjs/common';
import { db } from 'src/firebase/admin';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Injectable()
export class OpenpayService {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  async newChange(body: ChangeSuccess) {
    const openpay = await db
      .collection('openpay')
      .doc(body.transaction.id)
      .get();

    const batch = db.batch();

    await openpay.ref.collection('ipn').add({
      ...body,
      created_at: new Date(),
    });

    if (body.type == 'payout.failed') {
      batch.update(openpay.ref, {
        status: 'failed',
      });

      await batch.commit();

      return 'FAILED';
    }
    if (body.type == 'charge.succeeded') {
      batch.update(openpay.ref, {
        status: 'success',
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
