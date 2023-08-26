import { Injectable } from '@nestjs/common';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  writeBatch,
  or,
  where,
  increment,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UsersService } from '../users/users.service';

@Injectable()
export class BinaryService {
  constructor(private readonly userService: UsersService) {}

  async calculatePositionOfBinary(
    sponsor_id: string,
    position: 'left' | 'right',
  ) {
    let parent_id = null;

    let next_user_id = sponsor_id;
    while (!parent_id) {
      const sponsorData = await getDoc(doc(db, `users/${next_user_id}`)).then(
        (r) => r.data(),
      );

      if (sponsorData[`${position}_binary_user_id`]) {
        next_user_id = sponsorData[`${position}_binary_user_id`];
      } else {
        parent_id = next_user_id;
      }
    }

    return {
      parent_id,
    };
  }

  async increaseBinaryPoints(registerUserId: string) {
    const batch = writeBatch(db);

    const isNew = await this.userService.isNewMember(registerUserId);

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
        const isIBOActive = await this.userService.isIBOActive(user.id);

        if (isActive && isIBOActive) {
          //se determina a que subcoleccion que se va a enfocar
          const positionCollection =
            position == 'left' ? 'left-points' : 'right-points';

          const subCollectionRef = doc(
            collection(db, `users/${user.id}/${positionCollection}`),
          );

          batch.set(subCollectionRef, {
            points: 100,
            user_id: currentUser,
          });
        }

        if (isNew) {
          batch.set(
            user.ref,
            { count_underline_people: increment(1) },
            { merge: true },
          );
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
    const rightDocs = await getDocs(query(rightPointsRef, orderBy('starts_at')));

    const leftPointsDocs = leftDocs.docs;
    const rightPointsDocs = rightDocs.docs;

    const batch = writeBatch(db);

    while (leftPointsDocs.length > 0 && rightPointsDocs.length > 0) {
        // Tomamos y eliminamos el documento más antiguo de cada lado
        const oldestLeftDoc = leftPointsDocs.shift();
        const oldestRightDoc = rightPointsDocs.shift();

        batch.delete(oldestLeftDoc.ref);
        batch.delete(oldestRightDoc.ref);
    }

    // Ejecutar la operación batch
    await batch.commit();
}
}
