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
        .get();

      console.log(next_user_id);

      if (sponsorData.get(`${position}_binary_user_id`)) {
        next_user_id = sponsorData.get(`${position}_binary_user_id`);
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

        batch.update(user.ref, {
          count_underline_people: firestore.FieldValue.increment(1),
        });
      } else {
        currentUser = null;
      }
    } while (currentUser);

    // Commit the batch
    await batch.commit();
  }

  async increaseBinaryPoints(
    registerUserId: string,
    points: number,
    concept = 'Inscripción',
  ) {
    const batch = writeBatch(db);

    console.log('Repartir', points, 'puntos');

    const registerUser = await admin
      .collection('users')
      .doc(registerUserId)
      .get();
    let currentUser = registerUserId;

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

        console.log(user.id, 'isActive', isActive);

        if (isActive) {
          //se determina a que subcoleccion que se va a enfocar
          const positionCollection =
            position == 'left' ? 'left-points' : 'right-points';

          const subCollectionRef = doc(
            collection(db, `users/${user.id}/${positionCollection}`),
          );

          const subCollectionPointsRef = doc(
            collection(db, `users/${user.id}/points`),
          );

          batch.set(subCollectionRef, {
            points,
            user_id: registerUserId,
            name: registerUser.get('name') || '',
          });

          batch.set(subCollectionPointsRef, {
            points,
            side: position || 'right',
            user_id: registerUserId,
            user_email: registerUser.get('email') || 'noemail',
            user_name: registerUser.get('name') || '',
            user_sponsor_id: registerUser.get('sponsor_id') || null,
            user_sponsor: registerUser.get('sponsor') || '',
            created_at: new Date(),
            concept,
          });
        }
      } else {
        currentUser = null;
      }
    } while (currentUser);

    try {
      // Commit the batch
      const response = await batch.commit();
      return response;
    } catch (err) {
      await admin.collection('failed-binary-points').add({
        registerUserId,
      });
      throw err;
    }
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

  async checkBinary() {
    const users = await admin
      .collection('users')
      .where('presenter_1', '!=', null)
      .where('membership_status', '==', 'paid')
      .get();

    const notFound = [];

    for (const u of users.docs) {
      const dd = await admin
        .collection('users')
        .doc('9CXMbcJt2sNWG40zqWwQSxH8iki2')
        .collection('points')
        .where('user_id', '==', u.id)
        .get();

      if (dd.empty) {
        notFound.push(u.id);
      }
    }

    return notFound;
  }
}
