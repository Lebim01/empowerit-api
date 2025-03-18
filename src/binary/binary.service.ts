import { Injectable } from '@nestjs/common';
import {
  collection,
  doc,
  getDocs,
  query,
  writeBatch,
  or,
  where,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { db as admin } from '../firebase/admin';
import { UsersService } from '../users/users.service';
import { firestore } from 'firebase-admin';
import { BondsService } from 'src/bonds/bonds.service';
import { Bonds } from 'src/bonds/bonds';
import { MEMBERSHIPS_PRICES } from 'src/constants';

export const PARTICIPATION_RANGE_POINTS: Record<PackParticipations, number> = {
  '3000-participation': 1000,
};

class Node {
  data: any;
  left: any;
  right: any;

  constructor(data: any) {
    this.data = data;
    this.left = null;
    this.right = null;
  }
}

@Injectable()
export class BinaryService {
  constructor(
    private readonly userService: UsersService,
    private readonly bondsService: BondsService,
  ) {}

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
        const side =
          user.get('left_binary_user_id') == currentUser ? 'left' : 'right';
        currentUser = user.id;
        console.log(currentUser);
        const countUnderlinePeople = user.get('count_underline_people');

        if (countUnderlinePeople) {
          batch.update(user.ref, {
            count_underline_people: firestore.FieldValue.increment(1),
          });
        } else {
          batch.update(user.ref, {
            count_underline_people: 1,
          });
        }

        batch.set(
          admin
            .collection('users')
            .doc(user.id)
            .collection(`${side}-people`)
            .doc(registerUserId),
          {
            user_id: registerUserId,
            created_at: new Date(),
          },
        );
        if (
          currentUser === '9CXMbcJt2sNWG40zqWwQSxH8iki2' ||
          currentUser === 'corpotop@gmail.com'
        )
          currentUser = null;
      } else {
        currentUser = null;
      }
    } while (currentUser);

    console.log(3);
    // Commit the batch
    await batch.commit();
  }

  async increaseBinaryPoints(
    registerUserId: string,
    binaryPoints: number,
    rankPoins: number,
    concept = 'Inscripción',
    txn_id?: string,
  ) {
    const batch = admin.batch();

    console.log(
      'Repartir',
      { binaryPoints, rankPoins },
      'puntos',
      concept,
      txn_id,
    );

    const registerUser = await admin
      .collection('users')
      .doc(registerUserId)
      .get();
    let currentUser = registerUserId;

    do {
      const users = await admin
        .collection('users')
        .where(
          firestore.Filter.or(
            firestore.Filter.where('left_binary_user_id', '==', currentUser),
            firestore.Filter.where('right_binary_user_id', '==', currentUser),
          ),
        )
        .get();

      if (users.size > 0) {
        const user = users.docs[0];
        const userData = user.data();
        const position =
          userData.left_binary_user_id == currentUser ? 'left' : 'right';

        currentUser = user.id;

        // solo se suman puntos si el usuario esta activo
        const isActive = await this.userService.isActiveUser(user.id);

        if (isActive && user.id != registerUser.get('parent_binary_user_id')) {
          //se determina a que subcoleccion que se va a enfocar
          const positionCollection =
            position == 'left' ? 'left-points' : 'right-points';

          const subCollectionRef = admin
            .collection('users')
            .doc(user.id)
            .collection(positionCollection);

          const subCollectionPointsRef = admin
            .collection('users')
            .doc(user.id)
            .collection('points');

          /**
           * add (left | right) points
           * sirve para cobrar el binario
           */
          batch.set(subCollectionRef.doc(), {
            points: binaryPoints,
            user_id: registerUserId,
            name: registerUser.get('name') || '',
          });

          /**
           * (add points)
           * sirve para saber cuantos puntos totales historicos
           */
          batch.set(subCollectionPointsRef.doc(), {
            points: rankPoins,
            side: position || 'right',
            user_id: registerUserId,
            user_email: registerUser.get('email') || 'noemail',
            user_name: registerUser.get('name') || '',
            user_sponsor_id: registerUser.get('sponsor_id') || null,
            user_sponsor: registerUser.get('sponsor') || '',
            created_at: new Date(),
            concept,
            txn_id: txn_id || '',
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

  async increaseBinaryPointsForParticipations(
    registerUserId: string,
    points: number,
    participation: PackParticipations,
    concept = 'Participacion',
    cartId?: string,
  ) {
    const batch = writeBatch(db);

    console.log('Repartir', points, 'puntos');

    const registerUser = await admin
      .collection('users')
      .doc(registerUserId)
      .get();

    const membership = registerUser.get('membership');
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
      console.log('pasa');
      if (users.size > 0) {
        console.log('pasa');
        const user = users.docs[0];
        const userData = user.data();
        const position =
          userData.left_binary_user_id == currentUser ? 'left' : 'right';

        currentUser = user.id;

        console.log('xd', user.id);

        // solo se suman puntos si el usuario esta activo
        const isActive = await this.userService.isActiveUser(user.id);

        console.log(user.id, 'isActive', isActive);

        if (isActive) {
          console.log('es activo');
          //se determina a que subcoleccion que se va a enfocar
          const positionCollection =
            position == 'left' ? 'left-points' : 'right-points';

          const subCollectionRef = doc(
            collection(db, `users/${user.id}/${positionCollection}`),
          );

          const subCollectionPointsRef = doc(
            collection(db, `users/${user.id}/points`),
          );

          /**
           * add (left | right) points
           */
          batch.set(subCollectionRef, {
            points,
            user_id: registerUserId,
            name: registerUser.get('name') || '',
            created_at: new Date(),
            starts_at: new Date(),
          });

          /**
           * (add points)
           */
          batch.set(subCollectionPointsRef, {
            points: PARTICIPATION_RANGE_POINTS[participation],
            side: position || 'right',
            user_id: registerUserId,
            user_email: registerUser.get('email') || 'noemail',
            user_name: registerUser.get('name') || '',
            user_sponsor_id: registerUser.get('sponsor_id') || null,
            user_sponsor: registerUser.get('sponsor') || '',
            created_at: new Date(),
            concept,
            cartId: cartId || '',
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

  async increaseBinaryPointsForAutomaticFranchises(
    registerUserId: string,
    binary_points: number,
    range_points: number,
    concept = 'Inscripción de Franquicia Automatica',
  ) {
    const batch = writeBatch(db);

    console.log('Repartir', range_points, 'puntos de rango');
    console.log('Repartir', binary_points, 'puntos de binario');

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
      console.log('pasa');
      if (users.size > 0) {
        console.log('pasa');
        const user = users.docs[0];
        const userData = user.data();
        const position =
          userData.left_binary_user_id == currentUser ? 'left' : 'right';

        currentUser = user.id;

        console.log('xd', user.id);

        // solo se suman puntos si el usuario esta activo
        const isActive = await this.userService.isActiveUser(user.id);

        console.log(user.id, 'isActive', isActive);

        if (isActive) {
          console.log('es activo');
          //se determina a que subcoleccion que se va a enfocar
          const positionCollection =
            position == 'left' ? 'left-points' : 'right-points';

          const subCollectionRef = doc(
            collection(db, `users/${user.id}/${positionCollection}`),
          );

          const subCollectionPointsRef = doc(
            collection(db, `users/${user.id}/points`),
          );

          /**
           * add (left | right) points
           */
          batch.set(subCollectionRef, {
            points: binary_points,
            user_id: registerUserId,
            name: registerUser.get('name') || '',
            created_at: new Date(),
            starts_at: new Date(),
            user_sponsor_id: registerUser.get('sponsor_id') || null,
            user_sponsor: registerUser.get('sponsor') || '',
            user_email: registerUser.get('email') || 'noemail',
          });

          /**
           * (add points)
           */
          batch.set(subCollectionPointsRef, {
            points: range_points,
            side: position || 'right',
            user_id: registerUserId,
            user_email: registerUser.get('email') || 'noemail',
            user_name: registerUser.get('name') || '',
            user_sponsor_id: registerUser.get('sponsor_id') || null,
            user_sponsor: registerUser.get('sponsor') || '',
            created_at: new Date(),
            concept,
            cartId: '',
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

    const leftPointsRef = admin
      .collection('users')
      .doc(userId)
      .collection('left-points');
    const rightPointsRef = admin
      .collection('users')
      .doc(userId)
      .collection('right-points');

    const leftDocs = await leftPointsRef.orderBy('starts_at').get();
    const rightDocs = await rightPointsRef.orderBy('starts_at').get();

    const leftPointsDocs = leftDocs.docs;
    const rightPointsDocs = rightDocs.docs;

    const batch = admin.batch();
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
          points: firestore.FieldValue.increment(remaining_left_points * -1),
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
          points: firestore.FieldValue.increment(remaining_right_points * -1),
        });
        remaining_right_points = 0;
      }
    }

    // Ejecutar la operación batch
    await batch.commit();

    const user_binary_percent = 0;

    const amount = points_to_pay * user_binary_percent;
    if (user.get('is_binary_active')) {
      await this.bondsService.execBinary(userId, amount, {
        left_points: user.get('left_points'),
        right_points: user.get('right_points'),
      });
    } else {
      await this.bondsService.addLostProfit(userId, Bonds.BINARY, amount, null);
    }
  }

  async getBinaryUsers(
    session_user_id: string,
    start_user_id: string,
    max_levels: number,
    current_level: number,
    current_user: any,
  ) {
    if (current_level > max_levels) return current_user;

    if (session_user_id != start_user_id && current_level == 1) {
      const session_user = admin.collection('users').doc(session_user_id);
      const is_left_people = await session_user
        .collection('left-people')
        .where('user_id', '==', start_user_id)
        .get();
      const is_right_people = await session_user
        .collection('right-people')
        .where('user_id', '==', start_user_id)
        .get();

      /**
       * Verificamos si el usuario logeado tiene dentro de su red
       * al usuario que quiere consultar
       */
      if (is_left_people.empty && is_right_people.empty) return null;
    }

    const user = await admin.collection('users').doc(start_user_id).get();

    const node = new Node(user.data());

    if (user.get('left_binary_user_id')) {
      node.left = await this.getBinaryUsers(
        session_user_id,
        user.get('left_binary_user_id'),
        max_levels,
        current_level + 1,
        {},
      );
    }

    if (user.get('right_binary_user_id')) {
      node.right = await this.getBinaryUsers(
        session_user_id,
        user.get('right_binary_user_id'),
        max_levels,
        current_level + 1,
        {},
      );
    }

    if (current_level == 1) {
      return {
        left_points: user.get('left_points') || 0,
        right_points: user.get('right_points') || 0,
        tree: node,
      };
    }

    return node;
  }
}
