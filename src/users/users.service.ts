import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import {
  DocumentData,
  QueryDocumentSnapshot,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
//

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

  async getTopUsersByProfit() {
    const snap = await getDocs(
      query(collection(db, 'users'), orderBy('profits', 'desc'), limit(100)),
    );

    if (snap.empty) return null;

    const top = snap.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        profits: data.profits,
        rank: data.rank,
      };
    });

    return top;
  }

  async getTopUsersByReferrals() {
    const snap = await getDocs(
      query(
        collection(db, 'users'),
        orderBy('count_direct_people', 'desc'),
        limit(100),
      ),
    );

    if (snap.empty) return null;

    const top = snap.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        count_direct_people: data.count_direct_people,
      };
    });

    return top;
  }

  async getTopUsersByEarnings() {
    const data = await getDocs(collection(db, 'users'));
    const filteredData = await Promise.all(
      data.docs.map(async (doc) => {
        const payroll = await getDocs(
          query(collection(db, `users/${doc.id}/payroll`)),
        );

        if (payroll.empty) return undefined;

        const payrollData = payroll.docs.map((doc) => doc.data());

        const D28_DAYS_AGO = dayjs().subtract(28, 'days');
        const montlyPayroll = payrollData.filter((data) => {
          const isCurrent = dayjs(data.created_at.toDate()).isAfter(
            D28_DAYS_AGO,
          );
          if (isCurrent) return data;
        });
        if (montlyPayroll.length != 0) {
          const earnings = montlyPayroll.reduce((acc, curr) => {
            if (curr.total) {
              return acc + curr.total;
            }
            return acc;
          }, 0);
          if (earnings != 0) {
            return {
              id: doc.id,
              name: doc.data().name,
              email: doc.data().email,
              earnings,
            };
          }
        }
      }),
    );

    const validData = filteredData.filter((data) => data !== undefined);
    const validDataSorted = validData.sort((a, b) => b.earnings - a.earnings);

    return validDataSorted;
  }
}
