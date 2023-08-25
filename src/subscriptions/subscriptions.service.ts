import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
  collectionGroup,
  setDoc,
} from 'firebase/firestore';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { db } from '../firebase';
import Sentry from '@sentry/node';
import { ScholarshipService } from 'src/scholarship/scholarship.service';
import { CryptoapisService } from 'src/cryptoapis/cryptoapis.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly binaryService: BinaryService,
    private readonly bondService: BondsService,
    private readonly scholarshipService: ScholarshipService,
    private readonly cryptoapisService: CryptoapisService,
  ) {}

  async createPaymentAddress(id_user: string, type: 'pro' | 'supreme' | 'ibo') {
    const userRef = await getDoc(doc(db, `users/${id_user}`));
    const userData = userRef.data();
    let address = '';
    let referenceId = '';

    if (
      !userData.subscription[type] ||
      !userData.subscription[type].payment_link
    ) {
      const newAddress = await this.cryptoapisService.createNewWalletAddress();
      address = newAddress;

      const resConfirmation =
        await this.cryptoapisService.createFirstConfirmationTransaction(
          id_user,
          newAddress,
          type,
        );

      referenceId = resConfirmation.data.item.referenceId;
    } else {
      address = userData.subscription[type].payment_link.address;
      referenceId = userData.subscription[type].payment_link.referenceId;
    }

    const amount: any = await this.cryptoapisService.getBTCExchange(177);

    const payment_link = {
      referenceId,
      address,
      qr: `https://chart.googleapis.com/chart?chs=225x225&chld=L|2&cht=qr&chl=bitcoin:${address}?amount=${amount}`,
      status: 'pending',
      created_at: new Date(),
      amount,
      currency: 'BTC',
      expires_at: dayjs().add(15, 'minutes').toDate(),
    };

    await updateDoc(userRef.ref, {
      [`subscription.${type}.payment_link`]: payment_link,
    });

    return {
      address: address,
      amount: payment_link.amount,
      currency: payment_link.currency,
      qr: payment_link.qr,
    };
  }

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

  async assingProMembership(id_user: string) {
    const isNew = await this.isNewMember(id_user);
    await updateDoc(doc(db, `users/${id_user}`), {
      'subscription.pro.payment_link': null,
      'subscription.pro.start_at': dayjs().toDate(),
      'subscription.pro.expires_at': dayjs()
        .add(isNew ? 56 : 28, 'days')
        .toDate(),
      'subscription.pro.status': 'paid',
      is_new: false,
    });
  }

  async assingIBOMembership(id_user: string) {
    await updateDoc(doc(db, `users/${id_user}`), {
      'subscription.ibo.payment_link': null,
      'subscription.ibo.start_at': dayjs().toDate(),
      'subscription.ibo.expires_at': dayjs().add(112, 'days').toDate(),
      'subscription.ibo.status': 'paid',
    });
  }

  async assingSupremeMembership(id_user: string) {
    await updateDoc(doc(db, `users/${id_user}`), {
      'subscription.supreme.payment_link': null,
      'subscription.supreme.start_at': dayjs().toDate(),
      'subscription.supreme.expires_at': dayjs().add(168, 'days').toDate(),
      'subscription.supreme.status': 'paid',
    });
  }

  async isNewMember(id_user: string) {
    const userRef = await getDoc(doc(db, `users/${id_user}`));
    const isNew = Boolean(userRef.get('is_new')) ?? false;
    return isNew;
  }

  async onPaymentIBOMembership(id_user) {
    await this.assingIBOMembership(id_user);
  }

  async onPaymentSupremeMembership(id_user) {
    await this.assingSupremeMembership(id_user);
  }

  async onPaymentProMembership(id_user: string) {
    const userDocRef = doc(db, `users/${id_user}`);
    const data = await getDoc(userDocRef).then((r) => r.data());
    const isNew = await this.isNewMember(id_user);

    /**
     * Asignar posicion en el binario solo para usuarios nuevos
     */
    if (!data.parent_binary_user_id) {
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
      } catch (err) {
        Sentry.configureScope((scope) => {
          scope.setExtra('id_user', id_user);
          scope.setExtra('message', 'no se pudo setear al hijo');
          Sentry.captureException(err);
        });
      }
    }

    /**
     * Se activa la membresia
     */
    await this.assingProMembership(id_user);

    /**
     * se crea un registro en la subcoleccion users/{id}/sanguine_users
     */
    if (isNew) {
      try {
        await this.insertSanguineUsers(id_user);
      } catch (err) {
        Sentry.configureScope((scope) => {
          scope.setExtra('id_user', id_user);
          scope.setExtra(
            'message',
            'no se pudo insertar los usuarios sanguineos',
          );
          Sentry.captureException(err);
        });
      }
    }

    const sponsorRef = await getDoc(doc(db, `users/${data.sponsor_id}`));
    const sponsorHasScholapship = sponsorRef.get('has_scholarship');
    /**
     * Si el sponsor no esta becado le cuenta para la beca
     */
    if (!sponsorHasScholapship) {
      await this.scholarshipService.addDirectPeople(sponsorRef.id);
      /**
       * Si el sponsor no esta becado no reparte bonos
       */
      return;
    }

    if (!isNew) {
      try {
        await this.bondService.execUserResidualBond(sponsorRef.id);
      } catch (err) {
        Sentry.configureScope((scope) => {
          scope.setExtra('sponsorRef', sponsorRef.id);
          scope.setExtra('message', 'no se repartio el bono residual');
          Sentry.captureException(err);
        });
      }
    }

    /**
     * aumenta los puntos del binario hacia arriba
     */
    try {
      await this.binaryService.increaseBinaryPoints(id_user);
    } catch (err) {
      Sentry.configureScope((scope) => {
        scope.setExtra('id_user', id_user);
        scope.setExtra('message', 'no se repartio el bono binario');
        Sentry.captureException(err);
      });
    }

    /**
     * aumentar puntos de bono directo 2 niveles
     */
    if (isNew) {
      try {
        await this.bondService.execUserDirectBond(data.sponsor_id);
      } catch (err) {
        Sentry.configureScope((scope) => {
          scope.setExtra('id_user', id_user);
          scope.setExtra('message', 'no se repartio el bono directo');
          Sentry.captureException(err);
        });
      }
    }
  }

  async insertSanguineUsers(id_user: string) {
    const userRef = await getDoc(doc(db, `users/${id_user}`));

    const current_user = {
      id: id_user,
      is_active: true,
      created_at: userRef.get('created_at'),
      sponsor_id: userRef.get('sponsor_id'),
      position: userRef.get('position'),
    };

    await setDoc(
      doc(db, `users/${current_user.sponsor_id}/sanguine_users/${id_user}`),
      {
        id_user: userRef.id,
        sponsor_id: current_user.sponsor_id,
        is_active: current_user.is_active,
        created_at: current_user.created_at || null,
        position: current_user.position || null,
      },
      {
        merge: true,
      },
    );

    const sanguine_sponsors = await getDocs(
      query(
        collectionGroup(db, 'sanguine_users'),
        where('id_user', '==', current_user.sponsor_id),
      ),
    );

    for (const sponsorSanguineRef of sanguine_sponsors.docs) {
      const userId = sponsorSanguineRef.ref.parent.parent.id;
      await setDoc(
        doc(db, `users/${userId}/sanguine_users/${id_user}`),
        {
          id_user: userRef.id,
          sponsor_id: current_user.sponsor_id,
          is_active: current_user.is_active,
          created_at: current_user.created_at || null,
          position: sponsorSanguineRef.get('position') || null,
        },
        {
          merge: true,
        },
      );
    }
  }

  // Actualizar el status a 'expired' de las subscripciones a partir de una fecha.
  // VALORES DE body COMPATIBLES:
  //    Fecha indicada: { day, month, year }
  //    Fecha actual: {}
  statusToExpired = async (body) => {
    // Respuesta para error
    let answer: object = {
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
const expireSubscription = async (fromDate: Date = new Date()) => {
  const _query = query(
    collection(db, 'users'),
    where('subscription.pro.status', '==', 'paid'),
    where('subscription.pro.expires_at', '<=', fromDate),
  );

  try {
    // Consultar todos los 'users'
    // que entren en las condiciones anteriores.
    const result = await getDocs(_query);
    result.docs.forEach((doc) => {
      //
    });

    const users_id: string[] = [];
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
