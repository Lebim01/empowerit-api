import { Injectable } from '@nestjs/common';
import {
  collection,
  doc,
  getDocs,
  query,
  writeBatch,
  or,
  where,
  orderBy,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { db as admin } from '../firebase/admin';
import { UsersService } from '../users/users.service';
import { firestore } from 'firebase-admin';

/**
 * Puntos que ganas al inscribir un paquete
 */
const pack_points: Record<Memberships, number> = {
  'alive-pack': 65,
  'freedom-pack': 240,
  pro: 50,
  supreme: 100,
  'elite-pack': 115,
  'vip-pack': 340,
  'business-pack': 650,
};

const pack_points_yearly: Record<'pro' | 'supreme', number> = {
  pro: 500,
  supreme: 1000,
};

@Injectable()
export class BinaryService {
  constructor(private readonly userService: UsersService) {}

  async calculatePositionOfBinary(
    sponsor_id: string,
    position: 'left' | 'right',
  ) {
    console.time('calculateBinaryPosition');

    let parent_id = null;

    let next_user_id = sponsor_id;
    while (!parent_id) {
      const sponsorData = await admin
        .collection('users')
        .doc(next_user_id)
        .get()
        .then((r) => r.data());

      if (sponsorData[`${position}_binary_user_id`]) {
        next_user_id = sponsorData[`${position}_binary_user_id`];
      } else {
        parent_id = next_user_id;
      }
    }

    console.timeEnd('calculateBinaryPosition');

    return {
      parent_id,
    };
  }

  async increaseUnderlinePeople(registerUserId: string) {
    const batch = admin.batch();

    let currentUser = registerUserId;
    let user = await admin.collection('users').doc(registerUserId).get();

    do {
      user = await admin
        .collection('users')
        .doc(user.get('parent_binary_user_id'))
        .get();
      if (user.exists) {
        currentUser = user.id;

        batch.set(
          user.ref,
          { count_underline_people: firestore.FieldValue.increment(1) },
          { merge: true },
        );
      } else {
        currentUser = null;
      }
    } while (currentUser);

    // Commit the batch
    await batch.commit();
  }

  async increaseBinaryPoints(registerUserId: string) {
    const batch = writeBatch(db);

    const registerUser = await admin
      .collection('users')
      .doc(registerUserId)
      .get();
    let currentUser = registerUserId;
    const membership_period = registerUser.get('membership_period');
    const points =
      membership_period == 'monthly'
        ? pack_points[registerUser.get('membership')]
        : pack_points_yearly[registerUser.get('membership')];

    do {
      const users = await getDocs(
        query(
          collection(db, 'users'),
          or(
            where('left_binary_user_id', '==', currentUser),
            where('right_binary_user_id', '==', currentUser),
          ),
        ),
      );
      if (users.size > 0) {
        const user = users.docs[0];
        const userData = user.data();
        const position =
          userData.left_binary_user_id == currentUser ? 'left' : 'right';

        currentUser = user.id;

        // solo se suman puntos si el usuario esta activo
        const isActive = await this.userService.isActiveUser(user.id);

        if (isActive) {
          //se determina a que subcoleccion que se va a enfocar
          const positionCollection =
            position == 'left' ? 'left-points' : 'right-points';

          const subCollectionRef = doc(
            collection(db, `users/${user.id}/${positionCollection}`),
          );

          batch.set(subCollectionRef, {
            points,
            user_id: registerUserId,
            name: registerUser.get('name'),
          });
        }
      } else {
        currentUser = null;
      }
    } while (currentUser);

    // Commit the batch
    await batch.commit();
  }

  async matchBinaryPoints(userId: string) {
    const user = await admin.collection('users').doc(userId).get();
    const leftPointsRef = collection(db, `users/${userId}/left-points`);
    const rightPointsRef = collection(db, `users/${userId}/right-points`);

    const leftDocs = await getDocs(query(leftPointsRef, orderBy('starts_at'))); // Asumiendo que tienes un campo 'date'
    const rightDocs = await getDocs(
      query(rightPointsRef, orderBy('starts_at')),
    );

    const leftPointsDocs = leftDocs.docs;
    const rightPointsDocs = rightDocs.docs;

    const batch = writeBatch(db);
    const points_to_pay =
      user.get('left_points') > user.get('right_points')
        ? user.get('right_points')
        : user.get('left_points');

    let remaining_left_points = points_to_pay;
    while (remaining_left_points > 0) {
      const oldestDoc = leftPointsDocs.shift();
      if (remaining_left_points >= oldestDoc.get('points')) {
        remaining_left_points -= oldestDoc.get('points');
        batch.delete(oldestDoc.ref);
      } else {
        batch.update(oldestDoc.ref, {
          points: increment(remaining_left_points * -1),
        });
        remaining_left_points = 0;
      }
    }

    let remaining_right_points = points_to_pay;
    while (remaining_right_points > 0) {
      const oldestDoc = rightPointsDocs.shift();
      if (remaining_right_points >= oldestDoc.get('points')) {
        remaining_right_points -= oldestDoc.get('points');
        batch.delete(oldestDoc.ref);
      } else {
        batch.update(oldestDoc.ref, {
          points: increment(remaining_right_points * -1),
        });
        remaining_right_points = 0;
      }
    }

    // Ejecutar la operación batch
    await batch.commit();
  }
}
