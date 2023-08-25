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

        batch.set(
          user.ref,
          {
            ...(isActive
              ? position == 'left'
                ? {
                    left_points: increment(100),
                  }
                : {
                    right_points: increment(100),
                  }
              : {}),

            count_underline_people: increment(1),
          },
          {
            merge: true,
          },
        );
      } else {
        currentUser = null;
      }
    } while (currentUser);

    // Commit the batch
    await batch.commit();
  }
}
