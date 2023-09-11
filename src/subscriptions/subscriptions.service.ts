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
  increment,
} from 'firebase/firestore';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { db } from '../firebase';
import * as Sentry from '@sentry/node';
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
    // Obtener datos del usuario
    const userRef = await getDoc(doc(db, `users/${id_user}`));
    const userData = userRef.data();
    let address = '';
    let referenceId = '';

    // Si no existe registro de la informacion de pago...
    if (
      !userData.subscription[type] ||
      !userData.subscription[type].payment_link
    ) {
      // Obtener un nuevo wallet para el pago
      const newAddress = await this.cryptoapisService.createNewWalletAddress();
      address = newAddress;

      // Crear primera confirmación de la transaccion
      const resConfirmation =
        await this.cryptoapisService.createFirstConfirmationTransaction(
          id_user,
          newAddress,
          type,
        );
      referenceId = resConfirmation.data.item.referenceId;
    }

    // Si existe registro...
    else {
      address = userData.subscription[type].payment_link.address;
      referenceId = userData.subscription[type].payment_link.referenceId;
    }

    const amount_type = {
      supreme: 100,
      pro: 177,
      ibo: 30,
    };
    const amount: any = await this.cryptoapisService.getBTCExchange(
      amount_type[type],
    );

    // Estructurar el campo payment_link
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

    // Guardar payment_link
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

  async assingMembership(id_user: string, type: 'pro' | 'supreme' | 'ibo') {
    // Obtener fechas
    const startAt: Date = await this.calculateStartDate(id_user, type);
    const expiresAt: Date = await this.calculateExpirationDate(id_user, type);

    // Generar objeto con cambios a registrar
    let changes = {};
    switch (type) {
      case 'pro': {
        changes = {
          'subscription.pro.payment_link': null,
          'subscription.pro.start_at': startAt,
          'subscription.pro.expires_at': expiresAt,
          'subscription.pro.status': 'paid',
          is_new: false,
        };
        break;
      }
      case 'supreme': {
        changes = {
          'subscription.supreme.payment_link': null,
          'subscription.supreme.start_at': startAt,
          'subscription.supreme.expires_at': expiresAt,
          'subscription.supreme.status': 'paid',
        };
        break;
      }
      case 'ibo': {
        changes = {
          'subscription.ibo.payment_link': null,
          'subscription.ibo.start_at': startAt,
          'subscription.ibo.expires_at': expiresAt,
          'subscription.ibo.status': 'paid',
        };
        break;
      }
    }

    // Registrar cambios
    await updateDoc(doc(db, `users/${id_user}`), changes);
  }

  /**
   * Obtener fecha de inicio.
   * Fecha en la que iniciara la membresia del 'type' enviado.
   */
  async calculateStartDate(
    id_user: string,
    type: 'pro' | 'supreme' | 'ibo',
  ): Promise<Date> {
    // Obtener la información del usuario
    const userDoc = await getDoc(doc(db, `users/${id_user}`));
    const { status, expires_at } = userDoc.data().subscription[type];

    // Obtener fecha de inicio
    let date: dayjs.Dayjs;
    if (status && status == 'paid') {
      console.log('Entro bien');
      date = dayjs((expires_at?.seconds || 0) * 1000 || new Date());
    } else {
      console.log('Entro donde no deberia');
      date = dayjs();
    }

    return date.toDate();
  }

  /**
   * Obtener fecha de expiración.
   * Fecha en la que finalizara la membresia del 'type' enviado.
   */
  async calculateExpirationDate(
    id_user: string,
    type: 'pro' | 'supreme' | 'ibo',
  ): Promise<Date> {
    // Obtener los días de membresia.
    let days = 0;
    switch (type) {
      case 'pro': {
        const isNew = await this.isNewMember(id_user);
        days = isNew ? 56 : 28;
        break;
      }
      case 'supreme': {
        days = 168;
        break;
      }
      case 'ibo': {
        days = 112;
        break;
      }
    }

    // Obtener la fecha de expiración
    const date: Date = dayjs(await this.calculateStartDate(id_user, type))
      .add(days, 'days')
      .toDate();

    console.log('Fecha de expiración: ', date.toISOString());
    return date;
  }

  async isNewMember(id_user: string) {
    const userRef = await getDoc(doc(db, `users/${id_user}`));
    const isNew = Boolean(userRef.get('is_new')) ?? false;
    return isNew;
  }

  async onPaymentIBOMembership(id_user: string) {
    await this.assingMembership(id_user, 'ibo');
  }

  async onPaymentSupremeMembership(id_user: string) {
    await this.assingMembership(id_user, 'supreme');
    await this.bondService.execSupremeBond(id_user);
  }

  async onPaymentProMembership(id_user: string) {
    const userDocRef = doc(db, `users/${id_user}`);
    const data = await getDoc(userDocRef).then((r) => r.data());
    const isNew = await this.isNewMember(id_user);

    /**
     * Asignar posicion en el binario (SOLO USUARIOS NUEVOS)
     */
    if (!data.parent_binary_user_id) {
      let finish_position = data.position;

      /**
       * Las dos primeras personas de cada ciclo van al lado del derrame
       */
      const sponsor = await getDoc(doc(db, `users/${data.sponsor_id}`));
      const sponsor_side = sponsor.get('position') ?? 'right';
      const forceDerrame =
        Number(sponsor.get('count_direct_people_this_cycle')) < 2;

      if (forceDerrame) {
        /**
         * Nos quiso hackear, y forzamos el lado correcto
         */
        if (data.position != sponsor_side) {
          finish_position = sponsor_side;
          await updateDoc(userDocRef, {
            position: sponsor_side,
          });
        }

        await updateDoc(sponsor.ref, {
          count_direct_people_this_cycle: increment(1),
        });
      }

      const binaryPosition = await this.binaryService.calculatePositionOfBinary(
        data.sponsor_id,
        finish_position,
      );

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
          finish_position == 'left'
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

      try {
        await this.binaryService.increaseUnderlinePeople(userDocRef.id);
      } catch (err) {
        Sentry.configureScope((scope) => {
          scope.setExtra('id_user', userDocRef.id);
          scope.setExtra(
            'message',
            'no se pudo incrementar count_underline_people',
          );
          Sentry.captureException(err);
        });
      }
    }

    /**
     * Se activa la membresia
     */
    await this.assingMembership(id_user, 'pro');

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
    const sponsorHasScholapship =
      Boolean(sponsorRef.get('has_scholarship')) ?? false;

    /**
     * aumentar contador de gente directa
     */
    if (isNew) {
      await updateDoc(sponsorRef.ref, {
        count_direct_people: increment(1),
        count_direct_people_this_month: increment(1),
      });
    }

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
        await this.bondService.execUserDirectBond(id_user);
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
  async statusToExpired(type: 'ibo' | 'supreme' | 'pro') {
    const _query = query(
      collection(db, 'users'),
      where(`subscription.${type}.status`, '==', 'paid'),
      where(`subscription.${type}.expires_at`, '<=', new Date()),
    );

    try {
      // Consultar todos los 'users'
      // que entren en las condiciones anteriores.
      const result = await getDocs(_query);

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
      console.log(
        result.size,
        "Subscripciones actualizadas a 'expired'.",
        type,
      );
      return true;
    } catch (e) {
      console.warn(e);
      return false;
    }
  }
}
