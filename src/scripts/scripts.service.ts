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
  collectionGroup,
  deleteDoc,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ScriptsService {
  usersCollectionRef = collection(db, 'users');
  D28_DAYS_AFTER_NOW = dayjs().add(28, 'day');
  DELAY = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  constructor(private readonly userService: UsersService) {}

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
      const docData = doc.data() as any;

      return {
        id: doc.id,
        ...docData,
      };
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

      if (subscription_expires_at) {
        continue;
      }

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
      const transactions = await getCountFromServer(
        collection(db, `users/${user.id}/transactions`),
      );
      await updateDoc(userDoc, {
        rank: 'vanguard',
        bond_residual_level_1: 0,
        bond_residual_level_2: 0,
        bond_supreme_level_1: 0,
        bond_supreme_level_2: 0,
        bond_supreme_level_3: 0,
        bond_scholarship_level_1: 0,
        bond_scholarship_level_2: 0,
        bond_scholarship_level_3: 0,
        count_scholarship_people: user.is_admin ? 2 : 0,
        count_direct_people_this_cycle: 0,
        has_scholarship: user.is_admin ? true : false,
        is_new: transactions.data().count == 0 ? true : false,
        profits: 0,
        left_points: 0,
        right_points: 0,
      });

      console.log('Rank Updated: ', 'vanguard', 'from user: ', user.id);

      await this.DELAY(50);
    }
    console.log('Script finished successfully');
  }

  async assignNewSubscriptionsObject() {
    const users = await this.getAllUsers();

    const updatePromises = users.map(async (user: any) => {
      const date = dayjs(user.subscription_expires_at?.seconds * 1000);
      const is_active = date.isValid() && date.isAfter(dayjs());

      const subscription = {
        pro: {
          expires_at: user.subscription_expires_at || null,
          start_at: user.subscription_start_at || null,
          status: user.subscription_expires_at
            ? is_active
              ? 'paid'
              : 'expired'
            : null,
        },
        supreme: {
          expires_at: null,
          start_at: null,
          status: null,
        },
        ibo: is_active
          ? {
              expires_at: dayjs().add(15, 'days').toDate(),
              start_at: dayjs().toDate(),
              status: 'paid',
            }
          : {
              expires_at: null,
              start_at: null,
              status: null,
            },
      };

      const userRef = doc(db, 'users', user.id);

      try {
        await updateDoc(userRef, {
          subscription,
          profits: 0,
          left_points: 0,
          right_points: 0,
        });
        console.log(`Updated subscription for user with ID ${user.id}`);
      } catch (error) {
        console.error(
          `Error updating subscription for user with ID ${user.id}:`,
          error,
        );
      }

      await this.DELAY(50);
    });

    await Promise.all(updatePromises);
  }

  /**
   * crear subcolccion sanguine_users
   */
  async assingSanguineUsers() {
    const users = await getDocs(collection(db, 'users'));

    let index = 0;
    for (const userRef of users.docs) {
      const current_user = {
        id: userRef.id,
        sponsor_id: userRef.get('sponsor_id'),
        is_active: await this.userService.isActiveUser(userRef.id),
        created_at: userRef.get('created_at'),
      };

      const path = [current_user.id];

      let prev_position = userRef.get('position');
      let sponsor_id = current_user.sponsor_id;
      while (sponsor_id) {
        const sponsorRef = await getDoc(doc(db, `users/${sponsor_id}`));

        await setDoc(
          doc(db, `users/${sponsorRef.id}/sanguine_users/${current_user.id}`),
          {
            id_user: userRef.id,
            sponsor_id: current_user.sponsor_id,
            is_active: current_user.is_active,
            created_at: current_user.created_at || null,
            position: prev_position || null,
          },
          {
            merge: true,
          },
        );

        path.push(sponsor_id);
        console.log(`(${path.length})`, path.join('> '));

        sponsor_id = sponsorRef.get('sponsor_id');
        prev_position = sponsorRef.get('position');
      }

      index++;
      console.log(index, '/', users.size);
    }
  }

  /**
   * crear subcoleccion right_users and left_users
   */
  async assignLeftRightUsers() {
    const users = await this.getAllUsers();

    const updatePromises = users.map(async (user: any) => {
      if (user.left_binary_user_id) {
        await addDoc(collection(db, `users/${user.id}/left_points`), {
          left_binary_user_id: user.left_binary_user_id,
          points: user.left_points || 0,
        });
        await this.DELAY(50);
      }

      if (user.right_binary_user_id) {
        await addDoc(collection(db, `users/${user.id}/right_points`), {
          right_binary_user_id: user.right_binary_user_id,
          points: user.right_points || 0,
        });
        await this.DELAY(50);
      }
    });

    await Promise.all(updatePromises);
  }

  async deleteExpiredPoints() {
    const currentDate = dayjs();

    // Busca todos los documentos en las subcolecciones 'left-points' y 'right-points'
    for (const subcollection of ['left-points', 'right-points']) {
      const pointsRef = collectionGroup(db, subcollection);

      const allPoints = await getDocs(pointsRef);

      for (const pointDoc of allPoints.docs) {
        const data = pointDoc.data();

        if (data.starts_at) {
          const startPointDate = dayjs(data.starts_at.toDate());
          const diffInDays = currentDate.diff(startPointDate, 'day');

          if (diffInDays > 84) {
            await deleteDoc(pointDoc.ref);
            console.log(`Deleted expired point with ID: ${pointDoc.id}`);
          }
        }
      }
    }
  }

  async deleteUsers() {
    const ignore = [
      '1QcZupKiTxTOYfe9CAfTQuaBcnK2',
      '7iRezG7E6vRq7OQywQN3WawSa872',
      'G3E5HN0K2XMDPPbO0BgkbGNfVZ33',
      '8MIprgTiKGOkZ1MhkFaB81wegdM2',
      '1ICmQvQgq1hfq1CxTJGj1jI6PC53',
    ];
    const users = await getDocs(collection(db, 'users')).then((r) => r.docs);

    for (const u of users) {
      console.log(u.id);
      if (!ignore.includes(u.id)) {
        await deleteDoc(u.ref);
      }
    }
  }
}
