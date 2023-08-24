import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  getCountFromServer,
} from 'firebase/firestore';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { db } from 'src/firebase';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly binaryService: BinaryService,
    private readonly bondService: BondsService,
  ) {}

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

  async assingMembership(id_user: string, isNew = false) {
    await updateDoc(doc(db, `users/${id_user}`), {
      payment_link: null,
      subscription: 'pro',
      subscription_start_at: dayjs().toDate(),
      subscription_expires_at: dayjs()
        .add(isNew ? 56 : 28, 'days')
        .toDate(),
      subscription_status: 'paid',
    });
  }

  async isNewMember(id_user: string) {
    const transactions = await getCountFromServer(
      collection(db, `users/${id_user}/transactions`),
    );
    const isNew = transactions.data().count == 0;
    return isNew;
  }

  async onPaymentProMembership(id_user: string) {
    const userDocRef = doc(db, `users/${id_user}`);
    const data = await getDoc(userDocRef).then((r) => r.data());

    const binaryPosition = await this.binaryService.calculatePositionOfBinary(
      data.sponsor_id,
      data.position,
    );
    console.log(binaryPosition);

    /**
     * se setea el valor del usuario padre en el usuario que se registro
     */
    await updateDoc(userDocRef, {
      parent_binary_user_id: binaryPosition.parent_id,
    });

    try {
      /**
       * se setea el valor del hijo al usuario ascendente en el binario
       */
      await updateDoc(
        doc(db, 'users/' + binaryPosition.parent_id),
        data.position == 'left'
          ? { left_binary_user_id: id_user }
          : { right_binary_user_id: id_user },
      );
    } catch (e) {
      console.info('no se pudo actualizar el binario derrame', e);
    }

    /**
     * aumenta los puntos del binario hacia arriba
     */
    if (data.sponsor_id) {
      try {
        await this.binaryService.increaseBinaryPoints(id_user);
      } catch (e) {
        console.info('no se repartio el bono binario', e);
      }
    }

    /**
     * aumentar puntos de bono directo 2 niveles
     */
    if (data.sponsor_id && !data.subscription) {
      try {
        await this.bondService.execUserDirectBond(data.sponsor_id);
      } catch (e) {
        console.info('no se repartio el bono directo', e);
      }
    }

    const isNew = await this.isNewMember(id_user);

    await this.assingMembership(id_user, isNew);
  }
}
