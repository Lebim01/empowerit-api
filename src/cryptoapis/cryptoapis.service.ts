import * as https from 'https';
import dayjs from 'dayjs';
import { Injectable } from '@nestjs/common';
import {
  collection,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from 'src/firebase';
import {
  ResponseCreateWalletAddress,
  ResponseNewUnconfirmedCoinsTransactions,
} from './types';
import axios from 'axios';

const default_options = {
  hostname: 'rest.cryptoapis.io',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'fb00b4aa1965ff6bc36b5fba67447a3c927f2f6a',
  },
};

const walletId = '64cbde4178ffd80007affa0f';
const blockchain = 'bitcoin';
const network = 'mainnet';
const hostapi = 'https://topx-academy-nest.vercel.app';

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
    const res = await cryptoapisRequest<ResponseCreateWalletAddress>(options);
    return res.data.item.address;
  }

  async createFirstConfirmationTransaction(userId: string, address: string) {
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
              callbackUrl: `${hostapi}/callbackCoins`,
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

  getBTCExchange = async (amount: number) => {
    return axios
      .get('https://blockchain.info/tobtc?currency=USD&value=' + amount)
      .then((r) => r.data);
  };

  async removeUnusedSubscriptionList(offset: number) {
    const options = {
      ...default_options,
      method: 'GET',
      path: '/v2/blockchain-events/bitcoin/mainnet/subscriptions',
      qs: { context: 'yourExampleString', limit: 10, offset: 0 },
    };

    /*const bunch = await Promise.all([
      cryptoapisRequest({
        ...options,
        limit: 10,
        offset,
        qs: { limit: 10, offset },
      }).then((r: any) => {
        return r?.data?.items || [];
      }),
    ]);*/

    const bunch = [];

    const data = bunch.map((docData) => {
      return {
        ...docData,
        created_at: dayjs(docData.createdTimestamp * 1000).toISOString(),
      };
    });

    for (const docData of data) {
      const snap = await getDocs(
        query(
          collection(db, 'users'),
          where('payment_link.address', '==', docData.address),
        ),
      );
      console.log(docData.address, snap.size);
      if (snap.size == 0) {
        await this.removeSubscriptionEvent(docData.referenceId);
      } else {
        const docUser = snap.docs[0].data();
        if (docUser.subscription_expires_at) {
          console.log(docUser.subscription_expires_at, 'eliminar');

          await this.removeSubscriptionEvent(docData.referenceId);
          await updateDoc(snap.docs[0].ref, {
            payment_link: {},
          });
        }
      }
    }

    return data;
  }

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
}
