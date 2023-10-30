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
} from 'firebase/firestore';
import { db } from '../firebase';
import { db as admin } from '../firebase/admin';
import { UsersService } from '../users/users.service';
import { ADMIN_USERS } from '../constants';
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
        const isProActive = await this.userService.isProActiveUser(user.id);
        const isIBOActive = await this.userService.isIBOActive(user.id);

        if (isProActive && isIBOActive) {
          //se determina a que subcoleccion que se va a enfocar
          const positionCollection =
            position == 'left' ? 'left-points' : 'right-points';

          const subCollectionRef = doc(
            collection(db, `users/${user.id}/${positionCollection}`),
          );

          batch.set(subCollectionRef, {
            points: 100,
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
    const leftPointsRef = collection(db, `users/${userId}/left-points`);
    const rightPointsRef = collection(db, `users/${userId}/right-points`);

    const leftDocs = await getDocs(query(leftPointsRef, orderBy('starts_at'))); // Asumiendo que tienes un campo 'date'
    const rightDocs = await getDocs(
      query(rightPointsRef, orderBy('starts_at')),
    );

    const leftPointsDocs = leftDocs.docs;
    const rightPointsDocs = rightDocs.docs;

    const batch = writeBatch(db);

    while (
      (leftPointsDocs.length > 0 || ADMIN_USERS.includes(userId)) &&
      rightPointsDocs.length > 0
    ) {
      // Tomamos y eliminamos el documento más antiguo de cada lado
      // Los admin no tienen puntos del lado izquierdo

      if (leftPointsDocs.length > 0) {
        const oldestLeftDoc = leftPointsDocs.shift();
        batch.delete(oldestLeftDoc.ref);
      }

      const oldestRightDoc = rightPointsDocs.shift();
      batch.delete(oldestRightDoc.ref);
    }

    // Ejecutar la operación batch
    await batch.commit();
  }
}
