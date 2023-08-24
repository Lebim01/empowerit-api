import { Injectable } from '@nestjs/common';
import {
  DocumentData,
  QueryDocumentSnapshot,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from 'src/firebase';
import dayjs from 'dayjs';

@Injectable()
export class UsersService {
  async isActiveUser(id_user: string) {
    const user = await getDoc(doc(db, `users/${id_user}`));
    const expires_at = user.get('subscription_expires_at');
    const is_admin = Boolean(user.get('is_admin'));
    return is_admin
      ? true
      : expires_at
      ? dayjs(expires_at.seconds * 1000).isAfter(dayjs())
      : false;
  }

  async getUserByPaymentAddress(
    address: string,
  ): Promise<null | QueryDocumentSnapshot<DocumentData, DocumentData>> {
    const snap = await getDocs(
      query(
        collection(db, 'users'),
        where('payment_link.address', '==', address),
      ),
    );

    if (snap.empty) return null;

    return snap.docs[0];
  }
}
