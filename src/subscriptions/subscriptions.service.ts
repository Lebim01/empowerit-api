import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  collectionGroup,
  setDoc,
} from 'firebase/firestore';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { db } from '../firebase';
import { db as admin } from '../firebase/admin';
import * as Sentry from '@sentry/node';
import { CryptoapisService } from 'src/cryptoapis/cryptoapis.service';
import { firestore } from 'firebase-admin';
import { PayloadAssignBinaryPosition } from './types';
import { google } from '@google-cloud/tasks/build/protos/protos';
import { GoogletaskService } from 'src/googletask/googletask.service';
import { ShopifyService } from 'src/shopify/shopify.service';
import { alivePack, businessPack, freedomPack } from './products_packs';

export const MEMBERSHIP_PRICES_MONTHLY: Record<Memberships, number> = {
  supreme: 199,
  pro: 99,
  'alive-pack': 129,
  'freedom-pack': 479,
  'business-pack': 1289,
  'elite-pack': 228,
  'vip-pack': 678,
};

export const MEMBERSHIP_PRICES_YEARLY = {
  supreme: 1999,
  pro: 999,
};

const isExpired = (expires_at: { seconds: number }) => {
  const date = dayjs(expires_at.seconds * 1000);
  const is_active = date.isValid() && date.isAfter(dayjs());
  return !is_active;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly binaryService: BinaryService,
    private readonly bondService: BondsService,
    private readonly cryptoapisService: CryptoapisService,
    private readonly googleTaskService: GoogletaskService,
    private readonly shopifyService: ShopifyService,
  ) {}

  async createPaymentAddress(
    id_user: string,
    type: Memberships,
    currency: Coins,
    period: 'monthly' | 'yearly' = 'monthly',
  ) {
    // Obtener datos del usuario
    const userRef = admin.collection('users').doc(id_user);
    const userData = await userRef.get().then((r) => r.data());
    let address = '';
    let referenceId = '';

    // Si no existe registro de la informacion de pago...
    if (
      userData.payment_link &&
      userData.payment_link[type] &&
      userData.payment_link[type].currency == currency
    ) {
      address = userData.payment_link[type].address;
      referenceId = userData.payment_link[type].referenceId;
    } else {
      // Obtener un nuevo wallet para el pago
      const newAddress = await this.cryptoapisService.createNewWalletAddress(
        currency,
      );
      address = newAddress;

      console.log('address:', newAddress);

      // Crear primera confirmación de la transaccion

      if (currency == 'LTC') {
        const resConfirmation =
          await this.cryptoapisService.createFirstConfirmationTransaction(
            id_user,
            newAddress,
            type,
            currency,
          );
        referenceId = resConfirmation.data.item.referenceId;
      } else if (currency == 'MXN') {
      }
    }

    const amount_type =
      period == 'monthly'
        ? MEMBERSHIP_PRICES_MONTHLY
        : MEMBERSHIP_PRICES_YEARLY;

    let amount = 0;

    if (currency == 'LTC') {
      amount = await this.cryptoapisService.getLTCExchange(amount_type[type]);
    }

    const qr_name = this.cryptoapisService.getQRNameFromCurrency(currency);

    // Estructurar el campo payment_link
    const payment_link = {
      referenceId,
      address,
      qr: `https://chart.googleapis.com/chart?chs=225x225&chld=L|2&cht=qr&chl=${qr_name}:${address}?amount=${amount}`,
      status: 'pending',
      created_at: new Date(),
      amount,
      currency,
      expires_at: dayjs().add(15, 'minutes').toDate(),
    };

    // Guardar payment_link
    await userRef.collection('address-history').add({ ...payment_link, type });
    await userRef.update({
      payment_link: {
        [type]: payment_link,
      },
    });

    return {
      address: address,
      amount: payment_link.amount,
      currency: payment_link.currency,
      qr: payment_link.qr,
    };
  }
  async isActiveUser(id_user: string) {
    const user = await admin.collection('users').doc(id_user).get();
    const expires_at = user.get('membership_expires_at');

    const is_admin =
      Boolean(user.get('is_admin')) || user.get('type') == 'top-lider';
    return is_admin
      ? true
      : expires_at
      ? dayjs(expires_at.seconds * 1000).isAfter(dayjs())
      : false;
  }

  async assingMembership(
    id_user: string,
    type: Memberships,
    period: 'monthly' | 'yearly',
  ) {
    // Obtener fechas
    const startAt: Date = await this.calculateStartDate(id_user);
    const expiresAt: Date = await this.calculateExpirationDate(
      id_user,
      type,
      period,
    );

    // Registrar cambios
    await admin.collection('users').doc(id_user).update({
      count_direct_people_this_cycle: 0,
      count_scholarship_people: 0,
      membership: type,
      membership_status: 'paid',
      membership_expires_at: expiresAt,
      payment_link: {},
      is_new: false,
    });

    await admin.collection('users').doc(id_user).collection('cycles').add({
      type,
      start_at: startAt,
      expires_at: expiresAt,
    });
  }

  /**
   * Obtener fecha de inicio.
   * Fecha en la que iniciara la membresia del 'type' enviado.
   */
  async calculateStartDate(id_user: string): Promise<Date> {
    // Obtener la información del usuario
    const userDoc = await admin.doc(`users/${id_user}`).get();
    const expires_at = userDoc.get('membership_expires_at');
    const status = userDoc.get('membership_status');

    // Obtener fecha de inicio
    let date: dayjs.Dayjs;
    if (status && status == 'paid') {
      date = dayjs((expires_at?.seconds || 0) * 1000 || new Date());
    } else {
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
    type: Memberships,
    period: 'monthly' | 'yearly',
  ): Promise<Date> {
    let days = 0;

    switch (type) {
      case 'pro':
      case 'supreme':
        if (period == 'yearly') days = 365;
        else days = 30;
        break;
      case 'business-pack':
        days = 90;
        break;
      default:
        days = 30;
        break;
    }

    // Obtener la fecha de expiración
    const date: Date = dayjs(await this.calculateStartDate(id_user))
      .add(days, 'days')
      .toDate();

    console.log('Fecha de expiración: ', date.toISOString());
    return date;
  }

  async isNewMember(id_user: string) {
    const userRef = await admin.collection('users').doc(id_user).get();
    const isNew = Boolean(userRef.get('is_new')) ?? false;
    return isNew;
  }

  async onPaymentMembership(id_user: string, type: Memberships) {
    const userDocRef = admin.collection('users').doc(id_user);
    const data = await userDocRef.get();
    const isNew = await this.isNewMember(id_user);

    const membership_period = data.get('membership_period');

    /**
     * Reconsumo pagado antes de tiempo
     * Agregar transaccion pendiente y repartir bonos despues
     */
    if (!isExpired(data.get('membership_expires_at'))) {
      await userDocRef.update({
        pending_activation: {
          created_at: new Date(),
          membership: type,
        },
      });
      return;
    }

    await this.addQueueBinaryPosition({
      id_user,
      sponsor_id: data.get('sponsor_id'),
      position: data.get('position'),
    });

    /**
     * Se activa la membresia
     */
    await this.assingMembership(id_user, type, membership_period);

    if (isNew) {
      await userDocRef.update({
        first_cycle_started_at: new Date(),
      });
    }

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

    const sponsorRef = await admin
      .collection('users')
      .doc(data.get('sponsor_id'))
      .get();

    /**
     * aumentar contador de gente directa
     */
    if (isNew) {
      await sponsorRef.ref.update({
        count_direct_people: firestore.FieldValue.increment(1),
        count_direct_people_this_month: firestore.FieldValue.increment(1),
      });
    }

    /**
     * aumentar puntos de bono directo 2 niveles
     */
    if (isNew) {
      try {
        const prices =
          membership_period == 'monthly'
            ? MEMBERSHIP_PRICES_MONTHLY
            : MEMBERSHIP_PRICES_YEARLY;
        const membership_price = prices[type];
        await this.bondService.execUserDirectBond(id_user, membership_price);
      } catch (err) {
        Sentry.configureScope((scope) => {
          scope.setExtra('id_user', id_user);
          scope.setExtra('message', 'no se repartio el bono directo');
          Sentry.captureException(err);
        });
      }
    }

    /**
     * enviar paquete de productos
     */
    const packs: PhisicMembership[] = [
      'alive-pack',
      'freedom-pack',
      'business-pack',
    ];
    if (packs.includes(type as any)) {
      const required_fields =
        data.get('address') &&
        data.get('zip') &&
        data.get('city.value') &&
        data.get('country.value') &&
        data.get('state.value') &&
        data.get('whatsapp');
      if (required_fields) {
        await this.createShopifyPack(id_user, type as PhisicMembership);
      } else {
        await userDocRef.collection('pending-ships').add({
          created_at: new Date(),
          pack: type,
        });
      }
    }
  }

  async addQueueBinaryPosition(body: PayloadAssignBinaryPosition) {
    type Method = 'POST';
    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST' as Method,
        url: `https://${process.env.VERCEL_URL}/subscriptions/assignBinaryPosition`,
        body: Buffer.from(JSON.stringify(body)),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    };

    await this.googleTaskService.addToQueue(
      task,
      this.googleTaskService.getPathQueue('assign-binary-position'),
    );
  }

  async insertSanguineUsers(id_user: string) {
    const userRef = await admin.collection('users').doc(id_user).get();

    const current_user = {
      id: id_user,
      is_active: true,
      created_at: userRef.get('created_at'),
      sponsor_id: userRef.get('sponsor_id'),
      position: userRef.get('position'),
    };

    await admin
      .collection('users')
      .doc(current_user.sponsor_id)
      .collection('sanguine_users')
      .doc(id_user)
      .set(
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
          created_at: new Date() || null,
          position: sponsorSanguineRef.get('position') || null,
        },
        {
          merge: true,
        },
      );
    }
  }

  // Actualizar el status a 'expired' de las subscripciones a partir de una fecha.
  async statusToExpired() {
    const _query = query(
      collection(db, 'users'),
      where(`membership_status`, '==', 'paid'),
      where(`memberhsip_expires_at`, '<=', new Date()),
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
          [`membership_status`]: 'expired',
        });
      });

      // Ejecutar lote
      await batch.commit();
      console.log(result.size, "Subscripciones actualizadas a 'expired'.");
      return true;
    } catch (e) {
      console.warn(e);
      return false;
    }
  }

  async assignBinaryPosition(
    payload: PayloadAssignBinaryPosition,
    volumen = true,
  ) {
    const user = await admin.collection('users').doc(payload.id_user).get();

    /**
     * Asignar posicion en el binario (SOLO USUARIOS NUEVOS)
     */
    const hasBinaryPosition = !!user.get('parent_binary_user_id');
    if (!hasBinaryPosition) {
      const finish_position = user.get('position');

      /**
       * Las dos primeras personas de cada ciclo van al lado del derrame
       */
      const sponsorRef = admin.collection('users').doc(user.get('sponsor_id'));

      const binaryPosition = await this.binaryService.calculatePositionOfBinary(
        user.get('sponsor_id'),
        finish_position,
      );

      /**
       * se setea el valor del usuario padre en el usuario que se registro
       */
      await user.ref.update({
        parent_binary_user_id: binaryPosition.parent_id,
      });
      await sponsorRef.update({
        count_direct_people_this_cycle: firestore.FieldValue.increment(1),
      });

      try {
        /**
         * se setea el valor del hijo al usuario ascendente en el binario
         */
        await admin
          .collection('users')
          .doc(binaryPosition.parent_id)
          .update(
            finish_position == 'left'
              ? { left_binary_user_id: user.id }
              : { right_binary_user_id: user.id },
          );
      } catch (err) {
        Sentry.configureScope((scope) => {
          scope.setExtra('id_user', user.id);
          scope.setExtra('message', 'no se pudo setear al hijo');
          Sentry.captureException(err);
        });
      }

      try {
        await this.binaryService.increaseUnderlinePeople(user.id);
      } catch (err) {
        Sentry.configureScope((scope) => {
          scope.setExtra('id_user', user.id);
          scope.setExtra(
            'message',
            'no se pudo incrementar count_underline_people',
          );
          Sentry.captureException(err);
        });
      }
    }

    /**
     * aumenta los puntos del binario hacia arriba
     */
    if (volumen) {
      try {
        await this.binaryService.increaseBinaryPoints(user.id);
      } catch (err) {
        Sentry.configureScope((scope) => {
          scope.setExtra('id_user', user.id);
          scope.setExtra('message', 'no se repartio el bono binario');
          Sentry.captureException(err);
        });
      }
    }
  }

  async createShopifyPack(idUser: string, pack: PhisicMembership) {
    const user = await admin.collection('users').doc(idUser).get();
    let shopify_id = user.get('shopify_id');

    if (!shopify_id) {
      const customer = await this.shopifyService.createCustomer({
        email: user.get('email'),
        firstName: user.get('name'),
        addresses: [
          {
            address1: user.get('address'),
            address2: '',
            city: user.get('city.value'),
            company: 'Empowerit TOP',
            country: user.get('country.label'),
            countryCode: user.get('country.value'),
            firstName: user.get('name'),
            lastName: '',
            phone: user.get('whatsapp'),
            province: user.get('state.label'),
            provinceCode: user.get('state.value'),
            zip: user.get('zip'),
            id: 0,
          },
        ],
      });
      shopify_id = customer.id;
      await user.ref.update({
        shopify_id,
      });
    }

    if (pack == 'alive-pack') {
      return this.shopifyService.createDraftOrder({
        phone: user.get('phone'),
        email: user.get('email'),
        purchasingEntity: {
          customerId: shopify_id,
        },
        lineItems: alivePack.map((item) => ({
          quantity: item.quantity,
          variantId: item.id,
        })),
        useCustomerDefaultAddress: true,
      });
    } else if (pack == 'freedom-pack') {
      return this.shopifyService.createDraftOrder({
        phone: user.get('phone'),
        email: user.get('email'),
        purchasingEntity: {
          customerId: shopify_id,
        },
        lineItems: freedomPack.map((item) => ({
          quantity: item.quantity,
          variantId: item.id,
        })),
        useCustomerDefaultAddress: true,
      });
    } else if (pack == 'business-pack') {
      return this.shopifyService.createDraftOrder({
        phone: user.get('phone'),
        email: user.get('email'),
        purchasingEntity: {
          customerId: shopify_id,
        },
        lineItems: businessPack.map((item) => ({
          quantity: item.quantity,
          variantId: item.id,
        })),
        useCustomerDefaultAddress: true,
      });
    }
  }
}
