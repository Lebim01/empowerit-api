import { Injectable } from '@nestjs/common';
import {
  CreateTransactionDto,
  FirebaseObject,
} from './dtos/create-transaction.dto';
import * as crypto from 'crypto';
import axios from 'axios';
import { db } from 'src/firebase/admin';
import { MEMBERSHIPS_PRICES } from 'src/constants';

@Injectable()
export class CoinpaymentsService {
  private readonly API_KEY_PUBLIC =
    '1ea731c26f2d930eddc92209c10a6584be41390ad8fc9b13d7fdbdc6c4b5072d';
  private readonly API_KEY_PRIVATE =
    'e13706eD69f45Fd0cBD8032b5DB4c86684826Ea6693d5390A1A6e3502fe3d4ac';
  private readonly URL_COINPAYMENTS = 'https://www.coinpayments.net/api.php';
  async createTransaction(data: CreateTransactionDto) {
    const amountBase = MEMBERSHIPS_PRICES[data.type];
    if (
      amountBase === undefined ||
      !Object.keys(MEMBERSHIPS_PRICES).includes(data.type)
    ) {
      throw new Error(`Invalid membership type: ${data.type}`);
    }
    const payload = {
      ...data,
      amount: amountBase,
      key: this.API_KEY_PUBLIC,
      version: '1',
      format: 'json',
    };
    const headers = this.generateHeaders(payload);
    try {
      const _response = await axios.post(
        this.URL_COINPAYMENTS,
        new URLSearchParams(payload),
        { headers },
      );
      const response = _response.data.result;
      const expires_at = await this.expiresAt(response.timeout);
      await this.updateFirebase(
        { ...response, uid: data.uid, expires_at: expires_at },
        data.type,
      );
      return response;
    } catch (error) {
      console.log('el error es', error);
      return error;
    }
  }
  private generateHeaders(payload: any) {
    const hmac = crypto.createHmac('sha512', this.API_KEY_PRIVATE);
    hmac.update(new URLSearchParams(payload).toString());
    return { HMAC: hmac.digest('hex') };
  }
  async expiresAt(timeout: number) {
    const actual_date = new Date();
    const calculated = actual_date.getTime() + timeout * 1000;
    const newTimeOut = new Date(calculated);
    return newTimeOut;
  }
  async updateFirebase(data: FirebaseObject, type: string) {
    const docRef = db.collection('users').doc(data.uid);
    try {
      await docRef.update({
        payment_link: {
          ...data,
          membership: type,
          status: 'pending',
          updated_at: new Date(),
        },
      });
    } catch (error) {
      console.log('el error es', error);
      return error;
    }
  }
  async getNotificationIpn(request, response) {
    const payload = request.body;
    const secret = '12345';
    // const hmacHeader = request.headers['hmac'] as string;

    // const hmac = crypto.createHmac('sha512', secret);
    // hmac.update(new URLSearchParams(payload).toString());
    // const calculatedHmac = hmac.digest('hex');

    // if (hmacHeader === calculatedHmac) {

    console.log('IPN recibido: ', payload);
    try {
      const isComplete = await this.confirmingPayment(
        payload.email,
        payload.status,
      );
      response.status(200).send('pago actualizado con exito');
      return { isComplete, payload };
    } catch (error) {
      response.status(400).send('pago no se pudo actualizar');
    }
  }
  async confirmingPayment(email: string, status: number) {
    const userPayment = await this.getUser(email);
    const updateRef = db.collection('users').doc(userPayment.id);

    try {
      if (status == -1) return false;
      if (status == 100) {
        await updateRef.update({
          'payment_link.status': 'paid',
        });
      }
      if (status == 1) {
        await updateRef.update({
          'payment_link.status': 'confirming',
        });
      }
      if (status == 0) {
        await updateRef.update({
          'payment_link.status': 'pending',
        });
      }
      const statusReturn = status == 100;
      return statusReturn;
    } catch (error) {
      console.error('ocurrio un error al actualizar el pago', error);
      return false;
    }
  }
  async getUser(email) {
    try {
      const user = await db
        .collection('users')
        .where('email', '==', email)
        .get();
      if (user.empty) return;
      const userPayment = user.docs.map(
        (d) => ({ ...d.data(), id: d.id } as any),
      )[0];
      return userPayment;
    } catch (error) {
      console.error('fallo al obtener el usuario', error);
      return null;
    }
  }
}
