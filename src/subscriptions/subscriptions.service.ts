import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from 'src/firebase';

@Injectable()
export class SubscriptionsService {
  async isActiveUser(id_user: string) {
    const user = await getDoc(doc(db, 'users/' + id_user));
    const expires_at = user.get('subscription_expires_at');
    const is_admin = Boolean(user.get('is_admin'));
    return is_admin
      ? true
      : expires_at
      ? dayjs(expires_at.seconds * 1000).isAfter(dayjs())
      : false;
  }

  async assingMembership(id_user: string, subscription: string) {
    await updateDoc(doc(db, 'users/' + id_user), {
      subscription,
      subscription_expires_at: dayjs().add(28, 'days').toDate(),
      subscription_status: 'paid',
    });
  }
}
