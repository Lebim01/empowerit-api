import { Injectable } from '@nestjs/common';
import {
  CreateTransactionDto,
  FirebaseObject,
} from './dtos/create-transaction.dto';
import * as crypto from 'crypto';
import axios from 'axios';
import { db } from 'src/firebase/admin';
import { MEMBERSHIPS_PRICES } from 'src/constants';
import { CREDITS_PACKS_PRICE, FRANCHISES_AUTOMATIC_PRICES, MEMBERSHIP_PRICES_MONTHLY } from 'src/subscriptions/subscriptions.service';

@Injectable()
export class CoinpaymentsService {
  private readonly API_KEY_PUBLIC =
    'd8703d70ec2abaeafe78c194b431180cee734d78ab1d8078daaca64788640df7';
  private readonly API_KEY_PRIVATE =
    '7DDa1f4fba796f4ce5Ab5394aF9b58B38212ba10C9893a134eda634Fc6729552';
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
      console.log("payload", payload)
      console.log("el header", headers)
      console.log("el response", response)
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
      if (type in FRANCHISES_AUTOMATIC_PRICES) {
        console.log("se limpio el normal")
        await docRef.update({
          payment_link_automatic_franchises: {
            [type]: {
              ...data,
              membership: type,
              status: 'pending',
              updated_at: new Date(),

            }
          },
          payment_link: null
        });
      } else if (type in MEMBERSHIP_PRICES_MONTHLY) {
        console.log("se limpio el automatic")
        await docRef.update({
          payment_link: {
            [type]: {
              ...data,
              membership: type,
              status: 'pending',
              updated_at: new Date(),

            }
          },
          payment_link_automatic_franchises: null
        });
      } else if (type in CREDITS_PACKS_PRICE) {
        await docRef.update({
          payment_link_credits: {
            [type]: {
              ...data,
              status: 'pending',

            }
          }
        })
      }
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
        payload.txn_id
      );
      response.status(200).send('pago actualizado con exito');
      return { isComplete, payload };
    } catch (error) {
      response.status(400).send('pago no se pudo actualizar');
    }
  }
  async confirmingPayment(email: string, status: number, txn_id: string) {
    const userPayment = await this.getUser(email);
    const updateRef = db.collection('users').doc(userPayment.id);

    try {
      if (status === -1) return false;

      const userData = (await updateRef.get()).data();
      if (!userData) throw new Error('User data not found');
      const paymentKeys = [
        'payment_link',
        'payment_link_credits',
        'payment_link_automatic_franchises',
      ];

      let updated = false;
      let creditsToAdd = 0; 

      for (const key of paymentKeys) {
        const paymentObject = userData[key];
        if (paymentObject) {
          for (const membership in paymentObject) {
            if (paymentObject[membership]?.txn_id === txn_id) {
              console.log("el object to update is", paymentObject[membership])
              paymentObject[membership].status = this.getStatusFromCode(status);

              if (key === 'payment_link_credits' && Number(status) === 100) {
                creditsToAdd = CREDITS_PACKS_PRICE[membership] || 0;
                console.log("Créditos a sumar", creditsToAdd);
              }
              updated = true;
              break;
            }
          }
          if (updated) break;
        }
      }

      if (updated) {
        const updatePayload: any = {};
        paymentKeys.forEach(key => {
          if (userData[key]) {
            updatePayload[key] = userData[key];
          }
        });

        if (creditsToAdd > 0) {
          const currentCredits = Number(userData.credits) || 0;
          updatePayload.credits = currentCredits + creditsToAdd;
        }

        await updateRef.update(updatePayload);
        return status === 100;
      } else {
        console.warn('Transaction ID not found');
        return false;
      }
    } catch (error) {
      console.error('Ocurrió un error al actualizar el pago', error);
      return false;
    }
  }

  private getStatusFromCode(status: number): string {
    const converted = Number(status)
    switch (converted) {
      case 100:
        return 'paid';
      case 1:
        return 'confirming';
      case 0:
        return 'pending';
      default:
        return 'unknown';
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
