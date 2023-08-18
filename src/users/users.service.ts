import { Injectable } from '@nestjs/common';
import {
  DocumentData,
  QueryDocumentSnapshot,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from 'src/firebase';

@Injectable()
export class UsersService {
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
