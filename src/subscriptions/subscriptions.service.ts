import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  getCountFromServer,
  query,
  where,
  writeBatch,
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
    const user = await getDoc(doc(db, 'users/' + id_user));
    const expires_at = user.get('subscription.pro.expires_at');

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
      'subscription.pro.start_at': dayjs().toDate(),
      'subscription.pro.expires_at': dayjs()
        .add(isNew ? 56 : 28, 'days')
        .toDate(),
      'subscription.pro.status': 'paid',
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

  // Actualizar el status a 'expired' de las subscripciones a partir de una fecha.
  // VALORES DE body COMPATIBLES:
  //    Fecha indicada: { day, month, year }
  //    Fecha actual: {}
  statusToExpired = async (body) => {
    // Respuesta para error
    let answer: Object = {
      message: 'No fue posible actualizar las suscripciones',
      error: 'Subscriptions service',
      statusCode: 500,
    };

    const { day, month, year } = body;
    // Comportamiento para una fecha indicada
    if (day && month && year) {
      //if(('day'in body) && ('month'in month)  && ('year'in year))
      const fromDate: Date = new Date(`${year}-${month}-${day}`);
      answer = expireSubscription(fromDate)
        ? {
            message: `Suscripciones actualizadas a 'expired' a partir de ${year}-${month}-${day}`,
            statusCode: 204,
          }
        : answer;
    }
    // Comportamiento para la fecha actual
    else if (Object.keys(body).length == 0) {
      answer = expireSubscription()
        ? {
            message: `Suscripciones actualizadas a 'expired' a partir de la fecha actual`,
            statusCode: 204,
          }
        : answer;
    } else {
      answer = {
        message: 'El body no tiene el formato correcto: {day, month, year}',
        error: 'Wrong body',
        statusCode: 400,
      };
    }

    return answer;
  };
}

// Actualizar el status de las subscripciones
// a partir de una fecha dada
// o de la actual si no de proporciona nada.
const expireSubscription = async (fromDate: Date = new Date(Date.now())) => {
  const _query = query(
    collection(db, 'users'),
    where('subscription.pro.status', '==', 'paid'),
    where('subscription.pro.expires_at', '<=', fromDate),
  );

  try {
    // Consultar todos los 'users'
    // que entren en las condiciones anteriores.
    const result = await getDocs(_query);
    result.docs.forEach((doc) => {});

    let users_id: string[] = [];
    result.docs.forEach((doc) => {
      users_id.push(doc.id);
    });

    // Crear un lote de escritura
    // Actualizara el estado de los 'users' consultados
    const batch = writeBatch(db);
    [...users_id].forEach((id) => {
      const sfRef = doc(db, 'users', id.toString());
      batch.update(sfRef, {
        'subscription.pro.status': 'expired',
      });
    });

    // Ejecutar lote
    await batch.commit();
    console.log("Subscripciones actualizadas a 'expired'.");
    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
};
