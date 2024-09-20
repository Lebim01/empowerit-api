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
import { CryptoapisService } from 'src/cryptoapis/cryptoapis.service';
import { firestore } from 'firebase-admin';
import {
  PayloadAssignBinaryPosition,
  PayloadAssignBinaryPositionForAutomaticFranchises,
} from './types';
import { google } from '@google-cloud/tasks/build/protos/protos';
import { GoogletaskService } from 'src/googletask/googletask.service';
import { ShopifyService } from 'src/shopify/shopify.service';
import { alivePack, businessPack, freedomPack } from './products_packs';
import { pack_points, pack_points_yearly } from '../binary/binary_packs';
import Openpay from 'openpay';
import { EmailService } from 'src/email/email.service';

export const PARTICIPATIONS_PRICES: Record<PackParticipations, number> = {
  '3000-participation': 3000,
};

export const PARTICIPATIONS_CAP_LIMITS: Record<PackParticipations, number> = {
  '3000-participation': 6000,
};

export const PARTICIPATIONS_PRINCIPAL_CAP_LIMIT: Record<
  PackParticipations,
  number
> = {
  '3000-participation': 15000,
};

export const PARTICIPATIONS_BINARY_POINTS: Record<PackParticipations, number> =
  {
    '3000-participation': 300,
  };

export const MEMBERSHIP_PRICES_MONTHLY: Record<Memberships, number> = {
  supreme: 199,
  pro: 99,
  'alive-pack': 129,
  'freedom-pack': 479,
  'business-pack': 1289,
  'vip-pack': 228,
  'elite-pack': 678,
  'founder-pack': 3000,
  '49-pack': 49,
  '100-pack': 100,
  '300-pack': 300,
  '500-pack': 500,
  '1000-pack': 1000,
  '2000-pack': 2000,
  '3000-pack': 3000,
};

export const FRANCHISES_AUTOMATIC_CAPITALS: Record<
  AutomaticFranchises,
  number
> = {
  FA500: 500,
  FA1000: 1000,
  FA2000: 2000,
  FA5000: 5000,
  FA10000: 10000,
  FA20000: 20000,
};

export const FRANCHISES_AUTOMATIC_PRICES: Record<AutomaticFranchises, number> =
  {
    FA500: 599,
    FA1000: 1099,
    FA2000: 2199,
    FA5000: 5199,
    FA10000: 10299,
    FA20000: 20299,
  };

export const AUTOMATIC_FRANCHISES_CAP_LIMITS: Record<
  AutomaticFranchises,
  number
> = {
  FA500: 1000,
  FA1000: 2000,
  FA2000: 4000,
  FA5000: 10000,
  FA10000: 20000,
  FA20000: 40000,
};

export const AUTOMATIC_FRANCHISES_FIRMS: Record<AutomaticFranchises, number> = {
  FA500: 5,
  FA1000: 10,
  FA2000: 20,
  FA5000: 50,
  FA10000: 100,
  FA20000: 200,
};

export const MEMBERSHIP_CREDITS: Record<Memberships, number> = {
  supreme: 199,
  pro: 99,
  'alive-pack': 129,
  'freedom-pack': 479,
  'business-pack': 1289,
  'vip-pack': 228,
  'elite-pack': 678,
  'founder-pack': 3000,
  '49-pack': 0,
  '100-pack': 80,
  '300-pack': 250,
  '500-pack': 460,
  '1000-pack': 1000,
  '2000-pack': 2000,
  '3000-pack': 0,
};

export const AUTOMATIC_FRANCHISES_BINARY_POINTS: Record<
  AutomaticFranchises,
  number
> = {
  FA500: 50,
  FA1000: 100,
  FA2000: 200,
  FA5000: 500,
  FA10000: 1000,
  FA20000: 2000,
};

export const AUTOMATIC_FRANCHISES_RANGE_POINTS: Record<
  AutomaticFranchises,
  number
> = {
  FA500: 100,
  FA1000: 200,
  FA2000: 400,
  FA5000: 1000,
  FA10000: 2000,
  FA20000: 4000,
};

export const MEMBERSHIP_CAP: Record<Franchises, number> = {
  '49-pack': 0,
  '100-pack': 300,
  '300-pack': 1000,
  '500-pack': 2000,
  '1000-pack': 5000,
  '2000-pack': 10000,
  '3000-pack': 15000,
};

export const MEMBERSHIP_PRICES_YEARLY = {
  supreme: 1999,
  pro: 999,
};

export const FRANCHISE_FIRMS: Record<Franchises, number> = {
  '49-pack': 1,
  '100-pack': 1,
  '300-pack': 3,
  '500-pack': 5,
  '1000-pack': 10,
  '2000-pack': 20,
  '3000-pack': 30,
};

export const CREDITS_PACKS_PRICE: Record<PackCredits, number> = {
  '30-credits': 30,
  '50-credits': 50,
  '100-credits': 100,
  '500-credits': 500,
  '1000-credits': 1000,
};

const isExpired = (expires_at: { seconds: number } | null) => {
  if (!expires_at) return true;
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
    private readonly emailService: EmailService,
  ) {}

  async createPaymentAddressForCredits(
    id_user: string,
    type: PackCredits,
    currency: Coins,
  ) {
    // Obtener datos del usuario
    const userRef = admin.collection('users').doc(id_user);
    const userData = await userRef.get().then((r) => r.data());
    let address = '';
    let referenceId = '';
    let referenceId2 = '';

    // Si no existe registro de la informacion de pago...
    if (
      userData.payment_link_credits &&
      userData.payment_link_credits[type] &&
      userData.payment_link_credits[type].currency == currency
    ) {
      address = userData.payment_link_credits[type].address;
      referenceId = userData.payment_link_credits[type].referenceId;
    } else {
      // Obtener un nuevo wallet para el pago
      const newAddress = await this.cryptoapisService.createNewWalletAddress(
        currency,
      );
      address = newAddress;

      // Crear primera confirmación de la transaccion
      if (currency == 'LTC') {
        try {
          const resConfirmation =
            await this.cryptoapisService.createFirstConfirmationTransactionForCredits(
              id_user,
              newAddress,
              type,
              currency,
            );
          referenceId = resConfirmation.data.item.referenceId;
        } catch (err) {
          console.error(err);
        }

        try {
          const resConfirmation2 =
            await this.cryptoapisService.createCallbackConfirmationForCredits(
              id_user,
              newAddress,
              type,
              currency,
            );
          referenceId2 = resConfirmation2.data.item.referenceId;
        } catch (err) {
          console.error(err);
        }
      }
    }
    let exchange = 0;
    let amount = 0;
    let redirect_url = '';
    let openpay = {};
    if (currency == 'LTC') {
      amount = await this.cryptoapisService.getLTCExchange(
        CREDITS_PACKS_PRICE[type],
      );
    }
    if (currency == 'MXN') {
      exchange = await this.cryptoapisService.getUSDExchange();
      amount = Number(Number(exchange * CREDITS_PACKS_PRICE[type]).toFixed(2));

      const customer = {
        name: userData.name,
        last_name: '',
        phone_number: userData.whatsapp,
        email: userData.email,
      };

      const newCharge = {
        method: 'card',
        amount,
        description: 'Compra de Creditos',
        customer: customer,
        send_email: false,
        confirm: false,
        redirect_url:
          'https://backoffice.empowerittop.com/subscriptions?transaction=pending',
        use_3d_secure: true,
      };

      const res = await this.createCharge(newCharge);

      redirect_url = res.payment_method.url;
      openpay = res;
    }
    const qr_name = this.cryptoapisService.getQRNameFromCurrency(currency);
    // Estructurar el campo payment_link
    const payment_link_credits = {
      referenceId,
      referenceId2,
      address,
      qr: `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${qr_name}:${address}?amount=${amount}`,
      status: 'pending',
      created_at: new Date(),
      amount,
      redirect_url,
      currency,
      openpay,
      credits: CREDITS_PACKS_PRICE[type],
      expires_at: dayjs().add(15, 'minutes').toDate(),
    };
    // Guardar payment_link
    await userRef
      .collection('address-history')
      .add({ ...payment_link_credits, type });
    await userRef.update({
      payment_link_credits: {
        [type]: payment_link_credits,
      },
    });
    return {
      address: address,
      amount: payment_link_credits.amount,
      currency: payment_link_credits.currency,
      qr: payment_link_credits.qr,
    };
  }

  async createPaymentAddressForParticipations(
    id_user: string,
    type: PackParticipations,
    currency: Coins,
  ) {
    const userRef = admin.collection('users').doc(id_user);
    const userData = await userRef.get().then((r) => r.data());
    let address = '';
    let referenceId = '';
    let referenceId2 = '';

    if (
      userData.payment_link_participations &&
      userData.payment_link_participations[type] &&
      userData.payment_link_participations[type].currency == currency
    ) {
      address = userData.payment_link_participations[type].address;
      referenceId = userData.payment_link_participations[type].referenceId;
    } else {
      // Obtener un nuevo wallet para el pago
      const newAddress = await this.cryptoapisService.createNewWalletAddress(
        currency,
      );
      address = newAddress;

      console.log('address:', newAddress);

      // Crear primera confirmación de la transaccion

      if (currency == 'LTC') {
        try {
          const resConfirmation =
            await this.cryptoapisService.createFirstConfirmationTransaction(
              id_user,
              newAddress,
              type,
              currency,
              'callbackPaymentForParticipations',
            );
          referenceId = resConfirmation.data.item.referenceId;
        } catch (err) {
          console.error(err);
        }

        try {
          const resConfirmation2 =
            await this.cryptoapisService.createCallbackConfirmation(
              id_user,
              newAddress,
              type,
              currency,
              'callbackPaymentForParticipations',
            );
          referenceId2 = resConfirmation2.data.item.referenceId;
        } catch (err) {
          console.error(err);
        }
      } else if (currency == 'MXN') {
      }
      const qr_name = this.cryptoapisService.getQRNameFromCurrency(currency);
    }

    const amount_type = PARTICIPATIONS_PRICES;

    let amount = 0;
    let exchange = 0;
    let redirect_url = '';
    let openpay = {};

    if (currency == 'LTC') {
      amount = await this.cryptoapisService.getLTCExchange(amount_type[type]);
    }
    if (currency == 'MXN') {
      exchange = await this.cryptoapisService.getUSDExchange();
      amount = Number(Number(exchange * amount_type[type]).toFixed(2));

      const customer = {
        name: userData.name,
        last_name: '',
        phone_number: userData.whatsapp,
        email: userData.email,
      };

      const newCharge = {
        method: 'card',
        amount,
        description: 'Compra de paquete',
        customer: customer,
        send_email: false,
        confirm: false,
        redirect_url:
          'https://backoffice.empowerittop.com/subscriptions?transaction=pending',
        use_3d_secure: true,
      };

      const res = await this.createCharge(newCharge);

      redirect_url = res.payment_method.url;
      openpay = res;
    }

    const qr_name = this.cryptoapisService.getQRNameFromCurrency(currency);

    // Estructurar el campo payment_link
    const payment_link = {
      referenceId,
      referenceId2,
      address,
      qr: `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${qr_name}:${address}?amount=${amount}`,
      status: 'pending',
      created_at: new Date(),
      amount,
      currency,
      exchange,
      expires_at: dayjs().add(15, 'minutes').toDate(),
      redirect_url,
      openpay,
    };

    // Guardar payment_link
    await userRef.collection('address-history').add({ ...payment_link, type });
    await userRef.update({
      payment_link_participations: {
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

  async createPaymentAddressForAutomaticFranchises(
    id_user: string,
    type: AutomaticFranchises,
    currency: Coins,
    period: 'monthly' | 'yearly' = 'monthly',
  ) {
    console.log(id_user);
    // Obtener datos del usuario
    const userRef = admin.collection('users').doc(id_user);
    const userData = await userRef.get().then((r) => r.data());
    let address = '';
    let referenceId = '';
    let referenceId2 = '';

    // Si no existe registro de la informacion de pago...
    if (
      userData.payment_link_automatic_franchises &&
      userData.payment_link_automatic_franchises[type] &&
      userData.payment_link_automatic_franchises[type].currency == currency
    ) {
      address = userData.payment_link_automatic_franchises[type].address;
      referenceId =
        userData.payment_link_automatic_franchises[type].referenceId;
    } else {
      // Obtener un nuevo wallet para el pago
      const newAddress = await this.cryptoapisService.createNewWalletAddress(
        currency,
      );
      address = newAddress;

      console.log('address:', newAddress);

      // Crear primera confirmación de la transaccion

      if (currency == 'LTC') {
        try {
          const resConfirmation =
            await this.cryptoapisService.createFirstConfirmationTransaction(
              id_user,
              newAddress,
              type,
              currency,
              'callbackPaymentForAutomaticFranchises',
            );
          referenceId = resConfirmation.data.item.referenceId;
        } catch (err) {
          console.error(err);
        }

        try {
          const resConfirmation2 =
            await this.cryptoapisService.createCallbackConfirmation(
              id_user,
              newAddress,
              type,
              currency,
              'callbackPaymentForAutomaticFranchises',
            );
          referenceId2 = resConfirmation2.data.item.referenceId;
        } catch (err) {
          console.error(err);
        }
      } else if (currency == 'MXN') {
      }
      const qr_name = this.cryptoapisService.getQRNameFromCurrency(currency);
    }

    const amount_type = FRANCHISES_AUTOMATIC_PRICES;

    let amount = 0;
    let exchange = 0;
    let redirect_url = '';
    let openpay = {};

    if (currency == 'LTC') {
      amount = await this.cryptoapisService.getLTCExchange(amount_type[type]);
    }
    if (currency == 'MXN') {
      exchange = await this.cryptoapisService.getUSDExchange();
      amount = Number(Number(exchange * amount_type[type]).toFixed(2));

      const customer = {
        name: userData.name,
        last_name: '',
        phone_number: userData.whatsapp,
        email: userData.email,
      };

      const newCharge = {
        method: 'card',
        amount,
        description: 'Compra de Franquicia Automatica',
        customer: customer,
        send_email: false,
        confirm: false,
        redirect_url:
          'https://backoffice.empowerittop.com/subscriptions?transaction=pending',
        use_3d_secure: true,
      };

      const res = await this.createCharge(newCharge);

      redirect_url = res.payment_method.url;
      openpay = res;
    }

    const qr_name = this.cryptoapisService.getQRNameFromCurrency(currency);

    // Estructurar el campo payment_link_automatic_franchises
    const payment_link_automatic_franchises = {
      referenceId,
      referenceId2,
      address,
      qr: `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${qr_name}:${address}?amount=${amount}`,
      status: 'pending',
      created_at: new Date(),
      amount,
      currency,
      exchange,
      expires_at: dayjs().add(15, 'minutes').toDate(),
      membership_period: period,
      redirect_url,
      openpay,
    };

    // Guardar payment_link_automatic_franchises
    await userRef
      .collection('address-history')
      .add({ ...payment_link_automatic_franchises, type });
    await userRef.update({
      payment_link_automatic_franchises: {
        [type]: payment_link_automatic_franchises,
      },
    });

    return {
      address: address,
      amount: payment_link_automatic_franchises.amount,
      currency: payment_link_automatic_franchises.currency,
      qr: payment_link_automatic_franchises.qr,
    };
  }

  async createPaymentAddress(
    id_user: string,
    type: Memberships,
    currency: Coins,
    period: 'monthly' | 'yearly' = 'monthly',
  ) {
    console.log(id_user);
    // Obtener datos del usuario
    const userRef = admin.collection('users').doc(id_user);
    const userData = await userRef.get().then((r) => r.data());
    let address = '';
    let referenceId = '';
    let referenceId2 = '';

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
        try {
          const resConfirmation =
            await this.cryptoapisService.createFirstConfirmationTransaction(
              id_user,
              newAddress,
              type,
              currency,
              'callbackPayment',
            );
          referenceId = resConfirmation.data.item.referenceId;
        } catch (err) {
          console.error(err);
        }

        try {
          const resConfirmation2 =
            await this.cryptoapisService.createCallbackConfirmation(
              id_user,
              newAddress,
              type,
              currency,
              'callbackPayment',
            );
          referenceId2 = resConfirmation2.data.item.referenceId;
        } catch (err) {
          console.error(err);
        }
      } else if (currency == 'MXN') {
      }
      const qr_name = this.cryptoapisService.getQRNameFromCurrency(currency);
    }

    const amount_type =
      period == 'yearly' ? MEMBERSHIP_PRICES_YEARLY : MEMBERSHIP_PRICES_MONTHLY;

    let amount = 0;
    let exchange = 0;
    let redirect_url = '';
    let openpay = {};

    if (currency == 'LTC') {
      amount = await this.cryptoapisService.getLTCExchange(amount_type[type]);
    }
    if (currency == 'MXN') {
      exchange = await this.cryptoapisService.getUSDExchange();
      amount = Number(Number(exchange * amount_type[type]).toFixed(2));

      const customer = {
        name: userData.name,
        last_name: '',
        phone_number: userData.whatsapp,
        email: userData.email,
      };

      const newCharge = {
        method: 'card',
        amount,
        description: 'Compra de paquete',
        customer: customer,
        send_email: false,
        confirm: false,
        redirect_url:
          'https://backoffice.empowerittop.com/subscriptions?transaction=pending',
        use_3d_secure: true,
      };

      const res = await this.createCharge(newCharge);

      redirect_url = res.payment_method.url;
      openpay = res;
    }

    const qr_name = this.cryptoapisService.getQRNameFromCurrency(currency);

    // Estructurar el campo payment_link
    const payment_link = {
      referenceId,
      referenceId2,
      address,
      qr: `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${qr_name}:${address}?amount=${amount}`,
      status: 'pending',
      created_at: new Date(),
      amount,
      currency,
      exchange,
      expires_at: dayjs().add(15, 'minutes').toDate(),
      membership_period: period,
      redirect_url,
      openpay,
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

  createCharge(newCharge: any): Promise<any> {
    const openpay = new Openpay(
      process.env.OPENPAY_MERCHANT_ID,
      process.env.OPENPAY_SK,
      true,
    );

    return new Promise((resolve, reject) => {
      openpay.charges.create(newCharge, function (error, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
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

  async assingMembershipWithoutCredits(id_user: string, type: Franchises) {
    // Obtener fechas
    /*const startAt: Date = await this.calculateStartDate(id_user);
    const expiresAt: Date = await this.calculateExpirationDate(
      id_user,
      type,
      period,
    );*/

    /* Aqui va la parte para ver cuantos creditos le tocan dependiendo la membresia */

    // Registrar cambios
    await admin.collection('users').doc(id_user).update({
      count_direct_people_this_cycle: 0,
      count_scholarship_people: 0,
      membership: type,
      membership_started_at: new Date(),
      membership_status: 'paid',
      //membership_expires_at: expiresAt,
      payment_link: {},
      is_new: false,
      credits: 0,
      membership_cap_limit: MEMBERSHIP_CAP[type],
      membership_cap_current: 0,
    });

    /* Ya no seran ciclos quitar o dejarlo */
    await admin.collection('users').doc(id_user).collection('cycles').add({
      type,
      start_at: new Date(),
      //expires_at: expiresAt,
    });
  }

  async assingParticipation(id_user: string, type: PackParticipations) {
    // Crear una nueva fecha
    const currentDate = new Date();

    // Pasar al siguiente mes
    const nextMonthDate = new Date(currentDate);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    // Sumar otros dos meses
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 2);
    // Ajustar el día al 1
    nextMonthDate.setDate(1);

    const userRef = await admin.collection('users').doc(id_user).get();
    const email = userRef.get('email');
    const userName = userRef.get('name');

    await admin
      .collection('users')
      .doc(id_user)
      .collection('participations')
      .add({
        participation_name: type,
        starts_at: new Date(),
        next_pay: nextMonthDate,
        participation_cap_current: 0,
        participation_cap_limit: PARTICIPATIONS_CAP_LIMITS[type],
        created_at: new Date(),
        email,
        userName,
      });

    await admin.collection('users').doc(id_user).update({
      has_participations: true,
      membership_cap_limit: PARTICIPATIONS_PRINCIPAL_CAP_LIMIT[type],
    });
  }

  async assingMembership(id_user: string, type: Franchises) {
    // Obtener fechas
    /*const startAt: Date = await this.calculateStartDate(id_user);
    const expiresAt: Date = await this.calculateExpirationDate(
      id_user,
      type,
      period,
    );*/

    /* Aqui va la parte para ver cuantos creditos le tocan dependiendo la membresia */

    // Registrar cambios
    await admin
      .collection('users')
      .doc(id_user)
      .update({
        count_direct_people_this_cycle: 0,
        count_scholarship_people: 0,
        membership: type,
        membership_started_at: new Date(),
        membership_status: 'paid',
        //membership_expires_at: expiresAt,
        payment_link: {},
        is_new: false,
        credits: firestore.FieldValue.increment(MEMBERSHIP_CREDITS[type]),
        membership_cap_limit: MEMBERSHIP_CAP[type],
        membership_cap_current: 0,
      });

    /* Ya no seran ciclos quitar o dejarlo */
    await admin.collection('users').doc(id_user).collection('cycles').add({
      type,
      created_at: new Date(),
      //expires_at: expiresAt,
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

  async addCreditsManual(id_user: string, credits: number) {
    const userDocRef = await admin.collection('users').doc(id_user).get();
    const email = await userDocRef.get('email');
    const name = await userDocRef.get('name');
    try {
      await userDocRef.ref.update({
        credits: firestore.FieldValue.increment(credits),
      });
      await this.createAddCreditsManualDoc(id_user, credits, email, name);
    } catch (error) {
      console.log(error);
    }
  }

  async addCredits(id_user: string, pack_credits: PackCredits, currency: any) {
    const userDocRef = await admin.collection('users').doc(id_user).get();
    const email = await userDocRef.get('email');
    const name = await userDocRef.get('name');
    try {
      await userDocRef.ref.update({
        credits: firestore.FieldValue.increment(
          CREDITS_PACKS_PRICE[pack_credits],
        ),
      });
      await this.createAddCreditsDoc(
        id_user,
        pack_credits,
        currency,
        email,
        name,
      );
    } catch (error) {
      console.log(error);
    }
  }

  async createAddCreditsManualDoc(
    id_user: string,
    credits: number,
    email: string,
    name: string,
  ) {
    await admin
      .collection('users')
      .doc(id_user)
      .collection('credits-history')
      .add({
        id_user,
        email,
        name,
        total: credits,
        created_at: new Date(),
        concept: `Recarga manual de creditos`,
      });
  }

  async createAddCreditsDoc(
    id_user: string,
    pack_credits: PackCredits,
    currency: any,
    email: string,
    name: string,
  ) {
    await admin
      .collection('users')
      .doc(id_user)
      .collection('credits-history')
      .add({
        id_user,
        email,
        name,
        total: CREDITS_PACKS_PRICE[pack_credits],
        created_at: new Date(),
        concept: `Recarga de ${CREDITS_PACKS_PRICE[pack_credits]} créditos con ${currency}`,
      });
  }

  async onPaymentParticipations(
    id_user: string,
    type: PackParticipations,
    currency: string | null,
    activation_type: string,
  ) {
    const userDocRef = admin.collection('users').doc(id_user);
    const data = await userDocRef.get();

    const pack_price = PARTICIPATIONS_PRICES[type];

    /* 
      Se activara la participacion
     */
    await this.assingParticipation(id_user, type);

    /* Dar bir  */
    try {
      await this.bondService.execUserDirectBond(
        id_user,
        pack_price,
        true,
        true,
      );
    } catch (error) {
      console.log('Error dando el bono Directo en participatciones', error);
    }

    /* Dar range points y binario */
    try {
      await this.binaryService.increaseBinaryPointsForParticipations(
        id_user,
        PARTICIPATIONS_BINARY_POINTS[type],
        type,
      );
    } catch (error) {
      console.log(
        'Error incrementando los puntos de binario en participaciones',
        error,
      );
    }

    console.log('todo bienb');
  }

  async onPaymentAutomaticFranchises(
    user_id: string,
    type: AutomaticFranchises,
    currency: string | null,
    activation_type: string,
  ) {
    console.log('desde la funcion de onpaymenautomaticFranchises');
    //Sacar la referencia del usuario
    const userRef = await admin.collection('users').doc(user_id).get();
    //Sacar si el usuario es nuevo
    const isNew = await userRef.get('is_new');
    const email = await userRef.get('email');
    const startsAt = new Date();
    /* 90 dias para que comience el rendimiento */
    const availablePayDate = new Date(startsAt);
    /* 30 dias para el rendimiento de capital y retiro rapido(creditos) */
    const availablePayDateForCapital = new Date(startsAt);
    /* 365 dias para el retiro de capital*/
    const availablePayDateForCapitalPay = new Date(startsAt);

    availablePayDate.setDate(availablePayDate.getDate() + 90);

    availablePayDateForCapital.setDate(
      availablePayDateForCapital.getDate() + 30,
    );

    availablePayDateForCapitalPay.setDate(
      availablePayDateForCapitalPay.getDate() + 365,
    );
    //Activar la Franquicia automatica
    try {
      await userRef.ref.collection('automatic-franchises').add({
        user_id,
        type,
        email,
        starts_at: startsAt,
        created_at: startsAt,
        automatic_franchise_cap_current: 0,
        automatic_franchise_cap_limit: AUTOMATIC_FRANCHISES_CAP_LIMITS[type],
        available_pay_date_for_franchise_performance: availablePayDate,
        available_pay_date_for_capital_performance: availablePayDateForCapital,
        available_pay_date_for_capital_pay: availablePayDateForCapitalPay,
        capital: FRANCHISES_AUTOMATIC_CAPITALS[type],
      });
    } catch (error) {
      console.log(
        'Error a la hora de de crear el documento dentro de automatic-franchises',
        error,
      );
    }
    try {
      await userRef.ref.update({
        has_automatic_franchises: true,
      });
    } catch (error) {
      console.log(
        'Error a la hora de hace un update en has_atomatic_franchises',
        error,
      );
    }
    //Si es nuevo que se mande el email
    if (isNew) {
      await this.emailService.sendEmailNewUser(user_id);
    }
    //Si es nuevo que se cree en la colecccion de sanguine_users
    if (isNew) {
      try {
        await this.insertSanguineUsers(user_id);
      } catch (err) {
        console.error(err);
      }
    }
    //Si es nuevo que aumente el contador de gente directa
    //poner que user sea diferente a los dos que son admin
    const sponsorRef = await admin
      .collection('users')
      .doc(userRef.get('sponsor_id'))
      .get();
    if (isNew) {
      await sponsorRef.ref.update({
        count_direct_people: firestore.FieldValue.increment(1),
        count_direct_people_this_month: firestore.FieldValue.increment(
          AUTOMATIC_FRANCHISES_FIRMS[type],
        ),
      });
    }
    //Dar bono de inicio rapido
    try {
      await this.bondService.execUserDirectBond(
        user_id,
        FRANCHISES_AUTOMATIC_CAPITALS[type],
        isNew,
        false,
        true,
      );
    } catch (error) {
      console.log(
        'Error repartiendo binario en las franquicias automaticas',
        error,
      );
    }
    console.log({
      id_user: user_id,
      sponsor_id: userRef.get('sponsor_id'),
      position: userRef.get('position'),
      is_new: isNew,
      binary_points: AUTOMATIC_FRANCHISES_BINARY_POINTS[type],
      range_points: AUTOMATIC_FRANCHISES_RANGE_POINTS[type],
    });
    //Dar binario
    try {
      await this.addQueueBinaryPositionForAutomaticFranchises({
        id_user: user_id,
        sponsor_id: userRef.get('sponsor_id'),
        position: userRef.get('position'),
        is_new: isNew,
        binary_points: AUTOMATIC_FRANCHISES_BINARY_POINTS[type],
        range_points: AUTOMATIC_FRANCHISES_RANGE_POINTS[type],
      });
    } catch (error) {
      console.log(
        'Error dando binario en la funcion de onpaymentAutomaticFranchises',
        error,
      );
    }
  }

  async onPaymentMembership(
    id_user: string,
    type: Franchises | 'founder-pack',
    currency: string | null,
    activation_type: string,
  ) {
    const userDocRef = admin.collection('users').doc(id_user);
    const data = await userDocRef.get();
    const isNew = await this.isNewMember(id_user);

    const pack_price = MEMBERSHIP_PRICES_MONTHLY[type];

    if (type == '3000-pack') {
      const currentDate = new Date();
      const nextYearDate = new Date(
        currentDate.setFullYear(currentDate.getFullYear() + 1),
      );

      userDocRef.update({
        academy_access_expires_at: nextYearDate,
      });
    }
    console.log('despues de la comprobacion si no es un paquete 3000');

    if (type == 'founder-pack') {
      await this.execFounderPack(id_user);
      return;
    }
    console.log('despues de la comprobacion si no es un founder pack');

    /**
     * Reconsumo pagado antes de tiempo
     * Agregar transaccion pendiente y repartir bonos despues
     */
    /*if (!isExpired(data.get('membership_expires_at'))) {
      await userDocRef.update({
        pending_activation: {
          created_at: new Date(),
          membership: type,
          membership_period,
        },
      });
      return;
    }*/

    /* if (isNew && type != '49-pack') {
      await this.bondService.execBondPresenter(
        pack_price,
        id_user,
        data.get('presenter_1'),
        data.get('presenter_2'),
      );
    }
    console.log(
      'despues de la comprobacion si no es nueva y si no es una de type 49',
    ); */

    /**
     * Se activa la membresia
     */
    await this.assingMembership(id_user, type);
    console.log('despues de asignar la membresia');

    if (isNew) {
      await this.emailService.sendEmailNewUser(id_user);
    }
    console.log('despues de mandar el email si es un usuario nuevo');

    if (isNew) {
      await userDocRef.update({
        first_cycle_started_at: new Date(),
      });
    }
    console.log('despues del first cycle_started_At');

    /**
     * se crea un registro en la subcoleccion users/{id}/sanguine_users
     */
    if (isNew) {
      try {
        await this.insertSanguineUsers(id_user);
      } catch (err) {
        console.error(err);
        /*Sentry.configureScope((scope) => {
          scope.setExtra('id_user', id_user);
          scope.setExtra(
            'message',
            'no se pudo insertar los usuarios sanguineos',
          );
          Sentry.captureException(err);
        });*/
      }
    }
    console.log('despues del insertsanguineusers');

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
        count_direct_people_this_month: firestore.FieldValue.increment(
          FRANCHISE_FIRMS[type],
        ),
      });
    }

    console.log('despues del contador de gente directa');

    /**
     * aumentar puntos de bono directo 2 niveles
     */
    /* A partir de aqui modificare */
    if (type != '49-pack') {
      try {
        await this.bondService.execUserDirectBond(
          id_user,
          pack_price,
          isNew,
          false,
        );
      } catch (err) {
        console.error(err);
        /*Sentry.configureScope((scope) => {
          scope.setExtra('id_user', id_user);
          scope.setExtra('message', 'no se repartio el bono directo');
          Sentry.captureException(err);
          });*/
      }
    }
    console.log('despues de ejecutar el bono directo');

    await this.addQueueBinaryPosition({
      id_user,
      sponsor_id: data.get('sponsor_id'),
      position: data.get('position'),
      is_new: isNew,
    });
    console.log('despues de la funcion addQueueBinaryPosition');

    const userRef = await admin.collection('users').doc(id_user).get();
    const userEmail = await userRef.get('email');
    const userName = await userRef.get('name');
    const userPosition = await userRef.get('position');
    const userUpline = await userRef.get('parent_binary_user_id');
    const sponsorName = await userRef.get('sponsor');

    await admin.collection('memberships-history').add({
      activated: activation_type,
      created_at: new Date(),
      date: new Date(),
      email: userEmail,
      membership: type,
      name: userName,
      position: userPosition,
      sponsor: sponsorName,
      upline: userUpline || '',
      user_id: id_user,
      currency: currency || null,
    });
    console.log('despues del a;adir a memberships-history');
  }

  async addQueueBinaryPosition(body: PayloadAssignBinaryPosition) {
    type Method = 'POST';
    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST' as Method,
        url: `${process.env.API_URL}/subscriptions/assignBinaryPosition`,
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

  async addQueueBinaryPositionForAutomaticFranchises(
    body: PayloadAssignBinaryPositionForAutomaticFranchises,
  ) {
    type Method = 'POST';
    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST' as Method,
        url: `${process.env.API_URL}/subscriptions/assignBinaryPositionForAutomaticFranchises`,
        body: Buffer.from(JSON.stringify(body)),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    };

    await this.googleTaskService.addToQueue(
      task,
      this.googleTaskService.getPathQueue(
        'assign-binary-position-for-automatic-franchises',
      ),
    );
  }

  async insertSanguineUsers(id_user: string) {
    //Se trae la referencia del usuario
    const userRef = await admin.collection('users').doc(id_user).get();

    const current_user = {
      id: id_user,
      is_active: true,
      created_at: userRef.get('created_at'),
      sponsor_id: userRef.get('sponsor_id'),
      position: userRef.get('position'),
    };

    //Setea en el sponsor_id el usuario que se esta registrando en la subcoleccion de sanguine_users
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

    //Busca en todos los usuarios los que tengan el sponsor_id en la subcoleecion de sanguine_users
    const sanguine_sponsors = await admin
      .collectionGroup('sanguine_users')
      .where('id_user', '==', current_user.sponsor_id)
      .get();

    for (const sponsorSanguineRef of sanguine_sponsors.docs) {
      const userId = sponsorSanguineRef.ref.parent.parent.id;
      await admin
        .collection('users')
        .doc(userId)
        .collection('sanguine_users')
        .doc(id_user)
        .set(
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
      where(`membership_expires_at`, '<=', new Date()),
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
    const hasBinaryPosition = !!user.get('parent_binary_user_id'); //false
    console.log(hasBinaryPosition);
    if (!hasBinaryPosition) {
      const finish_position = user.get('position');

      /**
       * Las dos primeras personas de cada ciclo van al lado del derrame
       */
      const sponsorRef = admin.collection('users').doc(user.get('sponsor_id'));

      let binaryPosition = {
        parent_id: null,
      };

      console.log('sponsor_id', user.get('sponsor_id'));

      while (!binaryPosition?.parent_id) {
        binaryPosition = await this.binaryService.calculatePositionOfBinary(
          user.get('sponsor_id'),
          finish_position,
        );
      }

      /**
       * se setea el valor del usuario padre en el usuario que se registro
       */
      if (!binaryPosition?.parent_id) {
        throw new Error('Error al posicionar el binario');
      }

      try {
        await user.ref.update({
          parent_binary_user_id: binaryPosition.parent_id,
        });
      } catch (error) {
        console.log(
          'Error dentro de hacer un update en parent_binary_user_id',
          error,
        );
      }

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
        console.error(err);
        /*Sentry.configureScope((scope) => {
          scope.setExtra('id_user', user.id);
          scope.setExtra('message', 'no se pudo setear al hijo');
          Sentry.captureException(err);
        });*/
      }

      try {
        await this.binaryService.increaseUnderlinePeople(user.id);
      } catch (err) {
        console.log('Error increaseUnderlinePeople');
        console.error(err);
        /*Sentry.configureScope((scope) => {
          scope.setExtra('id_user', user.id);
          scope.setExtra(
            'message',
            'no se pudo incrementar count_underline_people',
          );
          Sentry.captureException(err);
        });*/
      }
      console.log('despues del segundo trychat');
    }

    /**
     * aumenta los puntos del binario hacia arriba
     */
    if (volumen) {
      try {
        /* Aqui */
        const is_new_pack = [
          '49-pack',
          '100-pack',
          '300-pack',
          '500-pack',
          '1000-pack',
          '2000-pack',
          '3000-pack',
        ].includes(user.get('membership'));
        let points = 0;
        if (is_new_pack) {
          if (payload.is_new) {
            points = pack_points[user.get('membership')];
          } else {
            points = pack_points[user.get('membership')] / 2;
          }
          console.log('points =>', points);
        } else {
          const membership_period = user.get('membership_period');
          points =
            membership_period == 'yearly'
              ? pack_points_yearly[user.get('membership')]
              : pack_points[user.get('membership')];
        }
        console.log('increaseBinaryPoints', user.id, points);
        if (user.get('membership') != '49-pack') {
          await this.binaryService.increaseBinaryPoints(user.id, points);
        }
        console.log('todo bien');
        return 'Puntos incrementados exitosamente';
      } catch (err) {
        console.log('Error increaseBinaryPoints');
        console.error(err);
        /*Sentry.configureScope((scope) => {
          scope.setExtra('id_user', user.id);
          scope.setExtra('message', 'no se repartio el bono binario');
          Sentry.captureException(err);
        });*/
      }
    }
  }

  async assignBinaryPositionForAutomaticFranchises(
    payload: PayloadAssignBinaryPositionForAutomaticFranchises,
    volumen = true,
  ) {
    console.log(
      'desde la funcion de assignBinaryPositionForAutomaticFranchises',
    );
    const user = await admin.collection('users').doc(payload.id_user).get();

    /**
     * Asignar posicion en el binario (SOLO USUARIOS NUEVOS)
     */
    const hasBinaryPosition = !!user.get('parent_binary_user_id'); //false
    console.log(hasBinaryPosition);
    if (!hasBinaryPosition) {
      const finish_position = user.get('position');

      /**
       * Las dos primeras personas de cada ciclo van al lado del derrame
       */
      const sponsorRef = admin.collection('users').doc(user.get('sponsor_id'));

      let binaryPosition = {
        parent_id: null,
      };

      console.log('sponsor_id', user.get('sponsor_id'));

      while (!binaryPosition?.parent_id) {
        binaryPosition = await this.binaryService.calculatePositionOfBinary(
          user.get('sponsor_id'),
          finish_position,
        );
      }

      /**
       * se setea el valor del usuario padre en el usuario que se registro
       */
      if (!binaryPosition?.parent_id) {
        throw new Error('Error al posicionar el binario');
      }

      try {
        await user.ref.update({
          parent_binary_user_id: binaryPosition.parent_id,
        });
      } catch (error) {
        console.log(
          'Error dentro de hacer un update en parent_binary_user_id',
          error,
        );
      }

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
        console.error(err);
        /*Sentry.configureScope((scope) => {
          scope.setExtra('id_user', user.id);
          scope.setExtra('message', 'no se pudo setear al hijo');
          Sentry.captureException(err);
        });*/
      }

      try {
        await this.binaryService.increaseUnderlinePeople(user.id);
      } catch (err) {
        console.log('Error increaseUnderlinePeople');
        console.error(err);
        /*Sentry.configureScope((scope) => {
          scope.setExtra('id_user', user.id);
          scope.setExtra(
            'message',
            'no se pudo incrementar count_underline_people',
          );
          Sentry.captureException(err);
        });*/
      }
      console.log('despues del segundo trychat');
    }

    /**
     * aumenta los puntos del binario hacia arriba
     */
    if (volumen) {
      try {
        await this.binaryService.increaseBinaryPointsForAutomaticFranchises(
          user.id,
          payload.binary_points,
          payload.range_points,
        );

        return 'Puntos incrementados exitosamente';
      } catch (err) {
        console.log('Error increaseBinaryPoints');
        console.error(err);
        /*Sentry.configureScope((scope) => {
          scope.setExtra('id_user', user.id);
          scope.setExtra('message', 'no se repartio el bono binario');
          Sentry.captureException(err);
        });*/
      }
    }
  }

  async createShopifyPack(
    idUser: string,
    pack: PhisicMembership | HibridMembership,
  ) {
    const user = await admin.collection('users').doc(idUser).get();
    let shopify_id = user.get('shopify_id');

    if (!shopify_id) {
      const customer = await this.shopifyService.createCustomer({
        email: user.get('email'),
        firstName: user.get('name'),
        lastName: '',
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
            phone: user.get('whatsapp').toString(),
            province: user.get('state.label'),
            provinceCode: user.get('state.value'),
            zip: user.get('zip').toString(),
          },
        ],
      });
      shopify_id = customer.id;
      await user.ref.update({
        shopify_id,
      });
    }

    if (pack == 'alive-pack' || pack == 'elite-pack') {
      return this.shopifyService.createDraftOrder({
        phone: user.get('phone'),
        email: user.get('email'),
        purchasingEntity: {
          customerId: shopify_id,
        },
        lineItems: alivePack.map((item) => ({
          quantity: item.quantity,
          variantId: 'gid://shopify/ProductVariant/' + item.id,
        })),
        useCustomerDefaultAddress: true,
      });
    } else if (pack == 'freedom-pack' || pack == 'vip-pack') {
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

  async execFounderPack(registerUserId: string) {
    const user = await admin.collection('users').doc(registerUserId).get();
    const bond = 147.5;

    await user.ref.update({
      founder_pack: {
        status: 'paid',
        created_at: new Date(),
        price: 2950,
      },
    });

    await admin
      .collection('users')
      .doc(user.get('sponsor_id'))
      .collection('profits_details')
      .add({
        amount: bond,
        created_at: new Date(),
        description: 'Founder pack',
        id_user: registerUserId,
        type: 'bond_founder',
        user_name: user.get('name'),
      });

    await admin
      .collection('users')
      .doc(user.get('sponsor_id'))
      .update({
        bond_founder: firestore.FieldValue.increment(bond),
      });
  }
  //Funcion para pagar el rendimiento diario
  async payAutomaticFranchisePerformance() {
    //Establecer el porcentaje global para el rendimiento general
    const performancePercentage = 3;
    const actualDate = new Date();
    const daysInThisMonth = new Date(
      actualDate.getFullYear(),
      actualDate.getMonth() + 1,
      0,
    ).getDate();
    //Verificar las personas que son available para su rendimiento diario available_pay_date_for_franchise_performance
    const automaticFranchises = await admin
      .collectionGroup('automatic-franchises')
      .where('available_pay_date_for_franchise_performance', '<=', new Date())
      .get();
    if (!automaticFranchises.empty) {
      for (const docu of automaticFranchises.docs) {
        const user_id = docu.data().user_id;
        const capital = docu.data().capital;
        //Primero verificare cuanto es la ganancia que le toca dependiendo de la franquicia que tiene (costo_franquicia/percentaje) / daysinthismonth
        const performance = Number(
          ((capital * (performancePercentage / 100)) / daysInThisMonth).toFixed(
            2,
          ),
        );
        const current_cap = Number(docu.data().automatic_franchise_cap_current);
        const cap_limit = Number(docu.data().automatic_franchise_cap_limit);

        console.log(`a ${user_id} le toca que le paguen ${performance}`);
        //Despues verificare cuanto es el cap limit y ver cuanto es el disponible
        const result = await this.availableProfit(
          performance,
          current_cap,
          cap_limit,
        );
        console.log('esto le tocaria a cada uno', result);
        //Sacare la referencia de la subcollecion de automatic-franchises-pending-profits de cada uno
        const pendingProfitsRef = admin
          .collection('users')
          .doc(docu.data().user_id)
          .collection('automatic-franchises-performance-pending-profits');
        //A cada uno le agregare un documento donde ahi le pondre el profit y las ganancias del resultado anterior
        await pendingProfitsRef.add({
          user_id,
          daily_performance: result,
          type: docu.data().type,
          created_at: new Date(),
          doc_id: docu.id,
        });
      }
    }
    return 'Funcion de payAutomaticFranchisePerformance ejecutada exitosamente';
  }
  //Funcion para pagar el rendimiendo de capital de 30 dias
  async payAutomaticFranchiseCapitalPerformance() {
    const performanceCapitalPercentage = 5;
    const actualDate = new Date();
    const daysInThisMonth = new Date(
      actualDate.getFullYear(),
      actualDate.getMonth() + 1,
      0,
    ).getDate();
    try {
      const automaticFranchises = await admin
        .collectionGroup('automatic-franchises')
        .where('available_pay_date_for_capital_performance', '<=', new Date())
        .get();
      if (automaticFranchises.empty)
        return 'actualmente no hay franquicias aptas para el redimiento con capital';

      for (const automaticFranchisesDocu of automaticFranchises.docs) {
        const docuData = automaticFranchisesDocu.data();
        const user_id = docuData.user_id;
        const capital = docuData.capital;
        const performance = Number(
          (
            (capital * (performanceCapitalPercentage / 100)) /
            daysInThisMonth
          ).toFixed(2),
        );
        const current_cap = Number(docuData.automatic_franchise_cap_current);
        const cap_limit = Number(docuData.automatic_franchise_cap_limit);
        const result = await this.availableProfit(
          performance,
          current_cap,
          cap_limit,
        );
        const pendingCapitalProfitsRef = admin
          .collection('users')
          .doc(user_id)
          .collection(
            'automatic-franchises-capital-performance-pending-profits',
          );
        await pendingCapitalProfitsRef.add({
          user_id,
          daily_performance: result,
          type: docuData.type,
          created_at: new Date(),
          doc_id: automaticFranchisesDocu.id,
        });
      }
    } catch (error) {
      console.log(error);
    }
    return 'rendimiento de capital repartido exitosamente';
  }
  async availableProfit(
    profit: number,
    current_cap: number,
    cap_limit: number,
  ) {
    if (current_cap + profit > cap_limit) {
      return cap_limit - current_cap;
    } else {
      return profit;
    }
  }
  async quickPayForAutomaticFranchisePerformance(
    doc_id: string,
    user_id: string,
    is_capital: boolean,
  ) {
    //Obtener todos los documentos dentro de automatic-franchises-performance-pending-profits el doc_id de el parametro doc_id
    const batch = admin.batch();
    if (is_capital) {
      try {
        const pendingProfits = await admin
          .collectionGroup(
            'automatic-franchises-capital-performance-pending-profits',
          )
          .where('doc_id', '==', doc_id)
          .get();

        let total = 0;
        for (const pendingProfitsDocu of pendingProfits.docs) {
          const profitData = pendingProfitsDocu.data();
          const profit = pendingProfitsDocu.data().daily_performance;
          total = total + Number(profit);

          const paidProfitRef = await admin
            .collection('users')
            .doc(user_id)
            .collection('paid-franchises-capital-performance-profits');

          await paidProfitRef.add({
            ...profitData,
            created_at: new Date(),
            paid_at: new Date(),
          });

          batch.delete(pendingProfitsDocu.ref);
        }
        Math.floor(total);
        const userRef = await admin.collection('users').doc(user_id).get();
        const email = userRef.get('email');

        const automaticFranchiseRef = await admin
          .collection('users')
          .doc(user_id)
          .collection('automatic-franchises')
          .doc(doc_id)
          .get();

        const automaticFranchiseCapCurrent = automaticFranchiseRef.get(
          'automatic_franchise_cap_current',
        );
        const automaticFranchiseCapLimit = automaticFranchiseRef.get(
          'automatic_franchise_cap_limit',
        );

        const capital = await automaticFranchiseRef.get('capital');

        const availableAmount = await this.availableAmountForCapital(
          total,
          automaticFranchiseCapCurrent,
          automaticFranchiseCapLimit,
          capital,
        );

        await userRef.ref.update({
          credits: firestore.FieldValue.increment(availableAmount),
        });

        await automaticFranchiseRef.ref.update({
          automatic_franchise_cap_current:
            firestore.FieldValue.increment(availableAmount),
          capital: firestore.FieldValue.increment(-availableAmount),
        });

        const payrollAutomaticFranchisesRef = admin
          .collection('users')
          .doc(user_id)
          .collection('payroll-capital-automatic-franchises');

        await payrollAutomaticFranchisesRef.add({
          user_id,
          email,
          created_at: new Date(),
          total: availableAmount,
          type_payroll: 'Retiro Rapido',
          doc_id,
        });
      } catch (error) {
        console.log(
          'Error en la en la parte de repartir el capital en el retiro rapido',
          error,
        );
      }
    } else {
      try {
        const pendingProfits = await admin
          .collectionGroup('automatic-franchises-performance-pending-profits')
          .where('doc_id', '==', doc_id)
          .get();

        let total = 0;
        for (const pendingProfitsDocu of pendingProfits.docs) {
          const profitData = pendingProfitsDocu.data();
          const profit = pendingProfitsDocu.data().daily_performance;
          total = total + Number(profit);

          const paidProfitRef = await admin
            .collection('users')
            .doc(user_id)
            .collection('paid-franchises-performance-profits');

          await paidProfitRef.add({
            ...profitData,
            created_at: new Date(),
            paid_at: new Date(),
          });

          batch.delete(pendingProfitsDocu.ref);
        }
        Math.floor(total);
        const userRef = await admin.collection('users').doc(user_id).get();
        const email = userRef.get('email');

        const automaticFranchiseRef = await admin
          .collection('users')
          .doc(user_id)
          .collection('automatic-franchises')
          .doc(doc_id)
          .get();

        const automaticFranchiseCapCurrent = automaticFranchiseRef.get(
          'automatic_franchise_cap_current',
        );
        const automaticFranchiseCapLimit = automaticFranchiseRef.get(
          'automatic_franchise_cap_limit',
        );

        const availableAmount = await this.availableAmount(
          total,
          automaticFranchiseCapCurrent,
          automaticFranchiseCapLimit,
        );

        await userRef.ref.update({
          credits: firestore.FieldValue.increment(availableAmount),
        });

        await automaticFranchiseRef.ref.update({
          automatic_franchise_cap_current:
            firestore.FieldValue.increment(availableAmount),
        });

        const payrollAutomaticFranchisesRef = admin
          .collection('users')
          .doc(user_id)
          .collection('payroll-automatic-franchises');

        await payrollAutomaticFranchisesRef.add({
          user_id,
          email,
          created_at: new Date(),
          total: availableAmount,
          type_payroll: 'Retiro Rapido',
          doc_id,
        });
      } catch (error) {
        console.log(
          'Error a la hora de hacer el retiro rapido con el rendimiento por cobrar',
          error,
        );
      }
    }

    await batch.commit();
  }
  async availableAmount(
    amount: number,
    cap_current: number,
    cap_limit: number,
  ) {
    if (amount + cap_current > cap_limit) {
      return Math.floor(cap_limit - cap_current);
    } else {
      return Math.floor(amount);
    }
  }
  async availableAmountForCapital(
    amount: number,
    cap_current: number,
    cap_limit: number,
    capital: number,
  ) {
    const remainingCap = cap_limit - cap_current;
    const cappedAmount = Math.min(amount, remainingCap);

    return Math.floor(Math.min(capital, cappedAmount));
  }
  async normalPayForAutomaticFranchisePerformance(
    doc_id: string,
    user_id: string,
    is_capital: boolean,
  ) {
    const pendingProfits = await admin
      .collectionGroup('automatic-franchises-performance-pending-profits')
      .where('doc_id', '==', doc_id)
      .get();

    const batch = admin.batch();
    let total = 0;
    for (const pendingProfitsDocu of pendingProfits.docs) {
      const profitData = pendingProfitsDocu.data();
      const profit = pendingProfitsDocu.data().daily_performance;
      total = total + Number(profit);

      const paidProfitRef = await admin
        .collection('users')
        .doc(user_id)
        .collection('paid-franchises-performance-profits');

      await paidProfitRef.add({
        ...profitData,
        created_at: new Date(),
        paid_at: new Date(),
      });

      batch.delete(pendingProfitsDocu.ref);
    }
    const userRef = await admin.collection('users').doc(user_id).get();
    const email = userRef.get('email');

    const automaticFranchiseRef = await admin
      .collection('users')
      .doc(user_id)
      .collection('automatic-franchises')
      .doc(doc_id)
      .get();

    const automaticFranchiseCapCurrent = automaticFranchiseRef.get(
      'automatic_franchise_cap_current',
    );
    const automaticFranchiseCapLimit = automaticFranchiseRef.get(
      'automatic_franchise_cap_limit',
    );

    const availableAmount = await this.availableAmount(
      total,
      automaticFranchiseCapCurrent,
      automaticFranchiseCapLimit,
    );

    await automaticFranchiseRef.ref.update({
      automatic_franchise_cap_current:
        firestore.FieldValue.increment(availableAmount),
    });

    const payrollAutomaticFranchisesRef = admin
      .collection('users')
      .doc(user_id)
      .collection('payroll-automatic-franchises');

    await payrollAutomaticFranchisesRef.add({
      user_id,
      email,
      created_at: new Date(),
      total: availableAmount,
      type_payroll: 'Pago solicitado con Litecoin',
      doc_id,
    });

    await batch.commit();
    return 'conexion exitosa desde la funcion de normalPayForAutomaticFranchisePerformance';
  }
}
