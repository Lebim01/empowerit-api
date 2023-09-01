import * as https from 'https';
import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import {
  ResponseCreateWalletAddress,
  ResponseNewUnconfirmedCoinsTransactions,
  ResponseNewConfirmedCoinsTransactions,
  CallbackNewUnconfirmedCoins,
  CallbackNewConfirmedCoins,
} from './types';
import axios from 'axios';
import { firestore } from 'firebase-admin';

const default_options = {
  hostname: 'rest.cryptoapis.io',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'fb00b4aa1965ff6bc36b5fba67447a3c927f2f6a',
  },
};

const walletId =
  process.env.CUSTOM_ENV == 'production'
    ? '64cbde4178ffd80007affa0f'
    : '64c6dd54aa48640007b8e26f';
const blockchain = 'bitcoin';
const network = process.env.CUSTOM_ENV == 'production' ? 'mainnet' : 'testnet';
const hostapi =
  process.env.CUSTOM_ENV == 'production'
    ? 'https://topx-academy-nest.vercel.app'
    : 'https://topx-academy-dev.vercel.app';

const streamResponse = (resolve: any, reject: any) => (res: any) => {
  const chunks: any[] = [];

  res.on('data', function (chunk: any) {
    chunks.push(chunk);
  });

  res.on('end', function () {
    const body = Buffer.concat(chunks);
    resolve(JSON.parse(body.toString()));
  });

  res.on('error', reject);
};

const cryptoapisRequest = async <Response>(
  options: any,
  body?: any,
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, streamResponse(resolve, reject));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

@Injectable()
export class CryptoapisService {
  async removeSubscriptionEvent(referenceId: string) {
    const options = {
      ...default_options,
      method: 'DELETE',
      path: `/v2/blockchain-events/bitcoin/mainnet/subscriptions/${referenceId}`,
    };
    await cryptoapisRequest(options);
  }

  async createNewWalletAddress() {
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/wallet-as-a-service/wallets/${walletId}/${blockchain}/${network}/addresses`,
      qs: { context: 'yourExampleString' },
    };
    const res = await cryptoapisRequest<ResponseCreateWalletAddress>(options, {
      context: 'yourExampleString',
      data: {
        item: {
          label: 'yourLabelStringHere',
        },
      },
    });
    return res.data.item.address;
  }

  async createFirstConfirmationTransaction(
    userId: string,
    address: string,
    type: 'ibo' | 'supreme' | 'pro',
  ) {
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/blockchain-events/${blockchain}/${network}/subscriptions/address-coins-transactions-unconfirmed`,
      qs: { context: userId },
    };
    const res =
      await cryptoapisRequest<ResponseNewUnconfirmedCoinsTransactions>(
        options,
        {
          context: userId,
          data: {
            item: {
              address: address,
              allowDuplicates: true,
              callbackSecretKey: 'a12k*?_1ds',
              callbackUrl: `${hostapi}/cryptoapis/callbackCoins/${type}`,
            },
          },
        },
      );
    return res;
  }

  async removeCallbackEvent(refereceId: string) {
    const options = {
      ...default_options,
      method: 'DELETE',
      path: `/v2/blockchain-events/${blockchain}/${network}/subscriptions/${refereceId}`,
    };
    await cryptoapisRequest(options);
  }

  async createCallbackConfirmation(
    id_user: string,
    address: string,
    type: 'ibo' | 'supreme' | 'pro',
  ) {
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/blockchain-events/${blockchain}/${network}/subscriptions/address-coins-transactions-confirmed`,
    };
    return await cryptoapisRequest<ResponseNewConfirmedCoinsTransactions>(
      options,
      {
        context: id_user,
        data: {
          item: {
            address: address,
            allowDuplicates: true,
            callbackSecretKey: 'a12k*?_1ds',
            callbackUrl: `${hostapi}/cryptoapis/callbackPayment/${type}`,
            receiveCallbackOn: 2,
          },
        },
      },
    );
  }

  sendRequestTransaction = async (
    recipients: { address: string; amount: string }[],
  ) => {
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/wallet-as-a-service/wallets/${walletId}/${blockchain}/${network}/transaction-requests`,
    };
    return await cryptoapisRequest(options, {
      context: '',
      data: {
        item: {
          callbackSecretKey: 'a12k*?_1ds',
          callbackUrl: `${hostapi}/callbackSendedCoins`,
          feePriority: 'standard',
          note: 'yourAdditionalInformationhere',
          prepareStrategy: 'minimize-dust',
          recipients,
        },
      },
    });
  };

  getBTCExchange = async (amount: number) => {
    return axios
      .get('https://blockchain.info/tobtc?currency=USD&value=' + amount)
      .then((r) => r.data);
  };

  async validateWallet(wallet: string) {
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/blockchain-tools/bitcoin/mainnet/addresses/validate`,
    };
    return cryptoapisRequest(options, {
      context: 'yourExampleString',
      data: {
        item: {
          address: wallet,
        },
      },
    });
  }

  /**
   * Guardar registro de la transaccion
   * dentro de una subcoleccion llamada 'transactions'
   * perneteciente a 'users'.
   */
  addTransactionToUser = async (
    user_id: string,
    transactionBody: CallbackNewUnconfirmedCoins | CallbackNewConfirmedCoins,
  ): Promise<boolean> => {
    const { event } = transactionBody.data;

    try {
      // Identificar el evento que guardara el registro.
      let resultado: boolean;
      switch (event) {
        case 'ADDRESS_COINS_TRANSACTION_UNCONFIRMED': {
          resultado = await this.addTransactionUnconfirmed(user_id, {
            ...transactionBody,
          } as CallbackNewUnconfirmedCoins);
          break;
        }
        case 'ADDRESS_COINS_TRANSACTION_CONFIRMED': {
          resultado = await this.addTransactionConfirmed(user_id, {
            ...transactionBody,
          } as CallbackNewConfirmedCoins);
          break;
        }
        default: {
          resultado = false;
          break;
        }
      }

      return resultado;
    } catch (e) {
      console.warn('Error al agregar transacción: ', e);
      return false;
    }
  };

  /**
   * Guardar registro de la transaccion
   * con evento ..._UNCONFIRMED
   */
  addTransactionUnconfirmed = async (
    user_id: string,
    transactionBody: CallbackNewUnconfirmedCoins,
  ): Promise<boolean> => {
    // Comprobar si ya existe registro de la transaccion
    const { transactionId } = transactionBody.data.item;
    const transactionDoc = await this.getTransactionOfUser(
      user_id,
      transactionId,
    );

    // Cancelar sí ya existe
    if (transactionDoc.size > 0) return false;

    // Guardar registro
    await db.collection(`users/${user_id}/transactions`).add({
      ...transactionBody,
      created_at: new Date(),
    });
    return true;
  };

  /**
   * Guardar registro de la transaccion
   * con evento ..._CONFIRMED
   */
  addTransactionConfirmed = async (
    user_id: string,
    transactionBody: CallbackNewConfirmedCoins,
  ): Promise<boolean> => {
    // Comprobar si ya existe registro de la transaccion
    const { transactionId } = transactionBody.data.item;
    const transactions = await this.getTransactionOfUser(
      user_id,
      transactionId,
    );

    /**
     * Sí no existe el registro
     * La agrega
     */
    if (transactions.size == 0) {
      await db.collection(`users/${user_id}/transactions`).add({
        ...transactionBody,
        created_at: new Date(),
      });
    } else {
      /**
       * Sí existe el registro
       * Lo modifica
       */
      const doc = transactions.docs[0];

      await doc.ref.update({
        [`data.event`]: 'ADDRESS_COINS_TRANSACTION_CONFIRMED',
        [`data.item.minedInBlock`]: transactionBody.data.item.minedInBlock,
        [`data.item.firstSeenInMempoolTimestamp`]:
          firestore.FieldValue.delete(),
      });
    }

    return true;
  };

  /**
   * Obtener un 'transaction'
   * de 'user'
   * con el id de la transacción
   */
  getTransactionOfUser = (
    user_id: string,
    transaction_id: string,
  ): Promise<FirebaseFirestore.DocumentData> => {
    return db
      .collection(`users/${user_id}/transactions`)
      .where(`data.item.transactionId`, '==', transaction_id)
      .get();
  };

  /**
   * Obtener todos los 'transaction'
   * de 'user'
   * con la dirección del wallet
   */
  getTransactionsOfUser = (
    user_id: string,
    addressWallet: string,
  ): Promise<FirebaseFirestore.DocumentData> => {
    // Calcular la fecha de hace un mes
    // const currentDate = new Date();
    // const oneMonthAgo = new Date();
    // oneMonthAgo.setMonth(currentDate.getMonth() - 1);

    return (
      db
        .collection(`users/${user_id}/transactions`)
        .where(`data.item.address`, '==', addressWallet)
        //.where('created_at', '>', oneMonthAgo)
        .get()
    );
  };

  /**
   * Calcular el monto pendiente a pagar.
   */
  calculatePendingAmount = async (
    id_user: string,
    addressWallet: string,
    totalAmount: number,
  ): Promise<number> => {
    try {
      // Calcular el monto ya pagado
      const paidAmount: number = await this.calculatePaidAmount(
        id_user,
        addressWallet,
      );
      // Sí el pago no fue completado
      return totalAmount - paidAmount;
    } catch (e) {
      console.log('Error al calcular el monto pendiente: ', e);
      return totalAmount;
    }
  };

  /**
   * Calcular el monto ya pagado.
   */
  calculatePaidAmount = async (
    id_user: string,
    addressWallet: string,
  ): Promise<number> => {
    try {
      // Obtener las transacciones
      const transactions = await this.getTransactionsOfUser(
        id_user,
        addressWallet,
      );
      const sizeT = transactions.size;

      // Obtener monto pagado
      let paidAmount = 0;
      for (let i = 0; i < sizeT; i++) {
        const doc = transactions.docs[i];
        const data = doc.data();
        paidAmount += Number.parseFloat(data.data?.item?.amount);
      }

      return paidAmount;
    } catch (e) {
      console.log('Error al calcular el monto pagado: ', e);
      return 0;
    }
  };

  generateQrUrl = (address: string, amount: number): string =>
    `https://chart.googleapis.com/chart?chs=225x225&chld=L|2&cht=qr&chl=bitcoin:${address}?amount=${amount}`;
}
