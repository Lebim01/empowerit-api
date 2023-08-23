import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
} from 'firebase/firestore';
import { db } from 'src/firebase';

@Injectable()
export class ScriptsService {
  usersCollectionRef = collection(db, 'users');
  D28_DAYS_AFTER_NOW = dayjs().add(28, 'day');
  DELAY = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async getAllUsers() {
    const data = await getDocs(this.usersCollectionRef);
    const users = data.docs.map((doc) => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
      };
    });
    return users;
  }

  async getUsersWithoutRank() {
    const data = await getDocs(this.usersCollectionRef);
    const filteredData = data.docs.map((doc) => {
      const docData = doc.data();
      if (!docData.rank) {
        return {
          id: doc.id,
          ...docData,
        };
      }
    });
    const validData = filteredData.filter((data) => data !== undefined);
    return validData;
  }

  async getExpiresAt() {
    const data = await getDocs(this.usersCollectionRef);
    const filteredData = data.docs.map((doc) => {
      const docData = doc.data();
      if (docData.subscription_expires_at) {
        if (!docData.subscription_start_at) {
          return {
            docId: doc.id,
            subscription_expires_at: docData.subscription_expires_at.toDate(),
          };
        }
      }
    });

    const validData = filteredData.filter((data) => data !== undefined);
    return validData;
  }

  async calculateStartAt() {
    const expiresAt = await this.getExpiresAt();
    const data = expiresAt.map((data) => {
      const expiresAfter28Days = dayjs(data.subscription_expires_at).isAfter(
        this.D28_DAYS_AFTER_NOW,
      );
      return {
        docId: data.docId,
        subscription_expires_at: data.subscription_expires_at,
        expiresAfter28Days,
      };
    });

    if (!data) return;

    for (const user of data) {
      if (!user) continue;

      const { docId, expiresAfter28Days, subscription_expires_at } = user;

      let startAt = dayjs(subscription_expires_at).subtract(28, 'day');
      if (expiresAfter28Days) {
        startAt = dayjs(subscription_expires_at).subtract(56, 'day');
      }
      const userDoc = doc(db, 'users', docId);

      await updateDoc(userDoc, {
        subscription_start_at: startAt.toDate(),
      });

      console.log('startAt Updated: ', startAt.toDate(), 'from user: ', docId);

      await this.DELAY(50);
    }

    console.log('Script finished successfully');
  }

  async duplicateUserDoc(userDocID: string, newId: string) {
    const _doc = await getDoc(doc(db, `users/${userDocID}`));
    const payroll = await getDocs(collection(db, `users/${userDocID}/payroll`));
    const rank_history = await getDocs(
      collection(db, `users/${userDocID}/rank_history`),
    );

    await setDoc(doc(db, `users/${newId}`), {
      ..._doc.data(),
    });

    for (const docSub of payroll.docs) {
      await addDoc(collection(db, `users/${newId}/payroll`), docSub.data());
    }

    for (const docSub of rank_history.docs) {
      await addDoc(
        collection(db, `users/${newId}/rank_history`),
        docSub.data(),
      );
    }
    return 1;
  }

  async assignInitialRank() {
    const users = await this.getUsersWithoutRank();

    for (const user of users) {
      if (!user) continue;
      const userDoc = doc(db, 'users', user.id);
      await updateDoc(userDoc, {
        rank: 'vanguard',
      });

      console.log('Rank Updated: ', 'vanguard', 'from user: ', user.id);

      await this.DELAY(50);
    }
    console.log('Script finished successfully');
  }

  async assignNewSubscriptionsObject() {
    return await this.getAllUsers();
  }
}
