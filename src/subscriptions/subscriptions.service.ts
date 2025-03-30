import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { BinaryService } from 'src/binary/binary.service';
import { BondsService } from 'src/bonds/bonds.service';
import { db } from '../firebase';
import { db as admin } from '../firebase/admin';
import { firestore } from 'firebase-admin';
import { PayloadAssignBinaryPosition } from './types';
import { google } from '@google-cloud/tasks/build/protos/protos';
import { GoogletaskService } from 'src/googletask/googletask.service';
import Openpay from 'openpay';
import { EmailService } from 'src/email/email.service';
import { isAutomaticFranchise, MEMBERSHIPS_PRICES } from 'src/constants';
import { binary_points } from 'src/binary/binary_packs';
import { rank_points } from 'src/ranks/ranks_object';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly binaryService: BinaryService,
    private readonly bondService: BondsService,
    private readonly googleTaskService: GoogletaskService,
    private readonly emailService: EmailService,
  ) {}

  async createPaymentAddressForCredits(
    id_user: string,
    amount: number,
    currency: Coins,
  ) {
    // Obtener datos del usuario
    const userRef = admin.collection('users').doc(id_user);
    const userData = await userRef.get().then((r) => r.data());

    const exchange = 20.5;
    let redirect_url = '';
    let openpay = {};

    if (currency == 'MXN') {
      amount = Number(Number(exchange * amount).toFixed(2));

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

    // Estructurar el campo payment_link
    const payment_link_credits = {
      qr: '',
      // qr: https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${qr_name}:${address}?amount=${amount},
      status: 'pending',
      created_at: new Date(),
      amount,
      redirect_url,
      currency,
      openpay,
      credits: amount,
      expires_at: dayjs().add(15, 'minutes').toDate(),
    };

    // Guardar payment_link
    await userRef
      .collection('address-history')
      .add({ ...payment_link_credits, type: 'payment_link_credits' });

    await userRef.update({
      payment_link_credits: {
        payment_link_credits: payment_link_credits,
      },
    });

    return {
      amount: payment_link_credits.amount,
      currency: payment_link_credits.currency,
      qr: payment_link_credits.qr,
    };
  }

  async createOpenpayLink(id_user: string, type: Memberships, currency: Coins) {
    const userRef = admin.collection('users').doc(id_user);
    const userData = await userRef.get().then((r) => r.data());

    const exchange = 20;
    let amount = 0;
    let redirect_url = '';
    let openpay;

    if (currency == 'MXN') {
      amount = Number(Number(exchange * MEMBERSHIPS_PRICES[type]).toFixed(2));

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

    // Estructurar el campo payment_link
    const payment_link = {
      status: 'pending',
      created_at: new Date(),
      amount,
      currency,
      exchange,
      expires_at: dayjs().add(15, 'minutes').toDate(),
      redirect_url,
      openpay,
      type: 'membership',
      membership_type: type,
      id_user,
    };

    const openpay_ref = await admin.collection('openpay').add(payment_link);
    await userRef.update({
      openpay_link: openpay_ref.id,
    });
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

  async assingMembershipWithoutCredits(id_user: string, type: Memberships) {
    await admin.collection('users').doc(id_user).update({
      count_direct_people_this_cycle: 0,
      membership: type,
      membership_started_at: new Date(),
      membership_status: 'paid',
      payment_link: {},
      is_new: false,
    });

    await admin.collection('users').doc(id_user).collection('cycles').add({
      type,
      start_at: new Date(),
      volumen: false,
    });
  }

  async assingMembership(id_user: string, type: Memberships) {
    if (isAutomaticFranchise(type)) {
    } else {
      try {
        await admin.collection('users').doc(id_user).update({
          count_direct_people_this_cycle: 0,
          membership: type,
          membership_started_at: new Date(),
          membership_status: 'paid',
          payment_link: {},
          is_new: false,
        });

        await admin.collection('users').doc(id_user).collection('cycles').add({
          type,
          created_at: new Date(),
          volumen: true,
        });
      } catch (error) {
        console.error('fallo al activar la membresia', error);
      }
    }
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

  async addCredits(id_user: string, amount: number, currency: any) {
    const userDocRef = await admin.collection('users').doc(id_user).get();
    const email = await userDocRef.get('email');
    const name = await userDocRef.get('name');
    try {
      await userDocRef.ref.update({
        credits: firestore.FieldValue.increment(amount),
      });
      await this.createAddCreditsDoc(id_user, amount, currency, email, name);
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
    amount: number,
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
        total: amount,
        created_at: new Date(),
        concept: `Recarga de ${amount} créditos con ${currency}`,
      });
  }
  async onPaymentMembership(
    id_user: string,
    type: Memberships,
    volumen = true,
  ) {
    const userDocRef = admin.collection('users').doc(id_user);
    const data = await userDocRef.get();
    const isNew = data.get('is_new');

    /*if (type == 'founder-pack') {
      await this.execFounderPack(id_user);
      return;
    }*/

    await this.assingMembership(id_user, type);

    await this.addDigitalService(id_user, type);

    if (type == 'FT2499') {
      await this.addMonthlyCredits(id_user);
    }

    if (isNew) {
      await this.emailService.sendEmailNewUser(id_user);
    }

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
        console.error(err);
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

    if (volumen) {
      try {
        await this.bondService.execUserDirectBond(id_user, type);
      } catch (err) {
        console.error(err);
      }
    }

    await this.addQueueBinaryPosition({
      id_user,
      position: data.get('position'),
      binaryPoints: binary_points[type],
      rankPoints: rank_points[type],
      volumen,
    });
  }

  async addMonthlyCredits(id_user: string) {
    let today = dayjs();
    const batch = admin.batch();

    for (let i = 1; i <= 12; i++) {
      today = today.add(i, 'month');
      batch.create(
        admin
          .collection('users')
          .doc(id_user)
          .collection('monthly-credits')
          .doc(),
        {
          credits: 100,
          reclaim_at: today.toDate(),
        },
      );
    }

    await batch.commit();
  }

  async addDigitalService(id: string, type: Memberships) {
    const newMrMoneyPowerDate = dayjs();
    const newMrSportMoneyDate = dayjs();

    if (type == 'FB79') {
      newMrMoneyPowerDate.add(1, 'month');
      newMrSportMoneyDate.add(1, 'month');
    } else if (type == 'FB200') {
      newMrMoneyPowerDate.add(3, 'month');
      newMrSportMoneyDate.add(3, 'month');
    } else if (type == 'FB500') {
      newMrMoneyPowerDate.add(6, 'month');
      newMrSportMoneyDate.add(6, 'month');
    } else if (type == 'FT1499') {
      newMrMoneyPowerDate.add(12, 'month');
      newMrSportMoneyDate.add(12, 'month');
    } else if (type == 'FT2499') {
      newMrMoneyPowerDate.add(12, 'month');
      newMrSportMoneyDate.add(12, 'month');
    }

    await admin.collection('users').doc(id).update({
      mr_money_power_expires_at: newMrMoneyPowerDate.toDate(),
      mr_sport_money_expires_at: newMrSportMoneyDate.toDate(),
      is_mr_money_active: true,
      is_mr_sport_active: true,
    });
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
      }

      try {
        await this.binaryService.increaseUnderlinePeople(user.id);
      } catch (err) {
        console.log('Error increaseUnderlinePeople');
        console.error(err);
      }
      console.log('despues del segundo trychat');
    }

    /**
     * aumenta los puntos del binario hacia arriba
     */
    if (volumen) {
      try {
        await this.binaryService.increaseBinaryPoints(
          user.id,
          payload.binaryPoints,
          payload.rankPoints,
        );
      } catch (err) {
        console.error(err);
      }
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
}
