import { Injectable } from '@nestjs/common';
import { delay } from '../constants';
import { db } from 'src/firebase/admin';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { firestore } from 'firebase-admin';
import { CREDITS_PACKS_PRICE } from 'src/subscriptions/subscriptions.service';


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

        const payment_links_memberships = Object.keys(user.get("payment_link")).map(key => user.get(`payment_link.${key}.openpay`)).filter(Boolean)
        if(payment_links_memberships.find(r => r.id == body.transaction.id)){
          const payment_link = user.get('payment_link');
          const membership = Object.keys(payment_link)[0] as Franchises;
          await user.ref.update({
            [`payment_link.${membership}.status`]: 'success',
          });
  
          await delay(500);
          await this.subscriptionService.onPaymentMembership(user.id, membership,'FIAT (MXN)',"Activada con Pago");
        }

        const payment_links_credits = Object.keys(user.get("payment_link_credits")).map(key => user.get(`payment_link_credits.${key}.openpay`)).filter(Boolean)
        if(payment_links_credits.find(r => r.id == body.transaction.id)){
          const payment_link = user.get('payment_link_credits');
          const creditsPack = Object.keys(payment_link)[0] as PackCredits;
          console.log(creditsPack)
          await user.ref.update({
            credits: firestore.FieldValue.increment(CREDITS_PACKS_PRICE[creditsPack]),
            payment_link_credits: {}
          })
        }

        return 'OK';
      }
    }
    return 'FAIL';
  }
}
