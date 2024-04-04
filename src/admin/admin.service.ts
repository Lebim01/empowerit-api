import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import { CryptoapisService } from '../cryptoapis/cryptoapis.service';
import { ranks_object } from '../ranks/ranks_object';
import { BinaryService } from '../binary/binary.service';
import dayjs from 'dayjs';
import { firestore } from 'firebase-admin';
import fs from 'fs';

const ADMIN_BINARY_PERCENT = 15 / 100;
const ADMIN_QUICK_START = 30 / 100;
const ADMIN_MENTOR_PERCENT = 30 / 100;
const ADMIN_USERS = [
  'eN7hWGlS2mVC1O9YnXU3U5xEknz1',
  'sVarUBihvSZ7ahMUMgwaAbXcRs03',
  'vzzvaofd1GXAdgH890pGswl5A5x1',
];

@Injectable()
export class AdminService {
  constructor(
    private readonly cryptoapisService: CryptoapisService,
    private readonly binaryService: BinaryService,
  ) {}

  async getPayroll(blockchain: Blockchains) {
    const users = await db.collection('users').get();
    const docs = users.docs.map((r) => ({ id: r.id, ...r.data() }));

    const payroll_data = docs
      .filter((docData: any) => {
        // los STARTER no cobran
        const is_starter =
          docData.subscription?.starter?.status == 'paid' || false;
        return !is_starter;
      })
      .map((docData: any) => {
        const isAdmin = docData.type == 'top-lider';
        const binary_side =
          docData.left_points > docData.right_points ? 'right' : 'left';
        const rank = ranks_object[docData.rank];
        const binary_points =
          rank.binary > 0 || isAdmin ? docData[`${binary_side}_points`] : 0;

        return {
          id: docData.id,
          name: docData.name,
          direct: docData.bond_direct || 0,
          direct_second_level: docData.bond_direct_second_level || 0,
          residual: docData.bond_residual_level_1 || 0,
          residual_second_level: docData.bond_residual_level_2 || 0,
          supreme: docData.bond_supreme_level_1 || 0,
          supreme_second_level: docData.bond_supreme_level_2 || 0,
          supreme_third_level: docData.bond_supreme_level_3 || 0,
          bond_direct_starter_level_1: docData.bond_direct_starter_level_1 || 0,
          bond_crypto_elite_level_1: docData.bond_crypto_elite_level_1 || 0,
          bond_crypto_elite_level_2: docData.bond_crypto_elite_level_2 || 0,
          bond_toprice_xpert_level_1: docData.bond_toprice_xpert_level_1 || 0,
          bond_toprice_xpert_level_2: docData.bond_toprice_xpert_level_2 || 0,

          binary:
            Math.floor(
              binary_points *
                (isAdmin ? ADMIN_BINARY_PERCENT : rank.binary) *
                100,
            ) / 100,
          binary_percent: isAdmin ? ADMIN_BINARY_PERCENT : rank.binary,
          binary_side,
          binary_points,
          left_points: docData.left_points,
          right_points: docData.right_points,
          wallet_bitcoin: docData.wallet_bitcoin,
          wallet_litecoin: docData.wallet_litecoin || '',
          profits: docData.profits || 0,
          rank: docData.rank,
          profits_this_month: docData.profits_this_month || 0,
        };
      })
      .map((doc) => ({
        ...doc,
        subtotal:
          doc.direct +
          doc.binary +
          doc.direct_second_level +
          doc.residual +
          doc.residual_second_level +
          doc.supreme +
          doc.supreme_second_level +
          doc.supreme_third_level +
          doc.bond_direct_starter_level_1 +
          doc.bond_crypto_elite_level_1 +
          doc.bond_crypto_elite_level_2 +
          doc.bond_toprice_xpert_level_1 +
          doc.bond_toprice_xpert_level_2,
      }))
      .map((doc) => ({
        ...doc,
        fee: Math.ceil(doc.subtotal * 0.05 * 100) / 100,
      }))
      .map((doc) => ({
        ...doc,
        total: doc.subtotal - doc.fee,
      }))
      .filter((doc) => doc.total >= 40)
      .filter((doc) =>
        blockchain == 'bitcoin'
          ? Boolean(doc.wallet_bitcoin)
          : Boolean(doc.wallet_litecoin),
      );

    const payroll_data_2 = await Promise.all(
      payroll_data.map(async (doc) => ({
        ...doc,
        crypto_amount:
          blockchain == 'bitcoin'
            ? await this.cryptoapisService.getBTCExchange(doc.total)
            : blockchain == 'litecoin'
            ? await this.cryptoapisService.getLTCExchange(doc.total)
            : 0,
      })),
    );

    return payroll_data_2;
  }

  async payroll(blockchain: Blockchains) {
    const payroll_data = await this.getPayroll(blockchain);

    const ref = await db.collection('payroll').add({
      total_usd: payroll_data.reduce((a, b) => a + b.total, 0),
      total_btc: payroll_data.reduce((a, b) => a + b.crypto_amount, 0),
      created_at: new Date(),
    });
    await Promise.all(
      payroll_data.map(async (doc) => {
        await ref.collection('details').add(doc);
        await db.collection(`users/${doc.id}/payroll`).add({
          ...doc,
          created_at: new Date(),
        });
        if (doc.binary_points > 0) {
          await this.binaryService.matchBinaryPoints(doc.id);
        }
      }),
    );

    for (const doc of payroll_data) {
      await db.doc('users/' + doc.id).update({
        profits: doc.profits + doc.total,
        bond_direct: 0,
        bond_direct_second_level: 0,
        bond_residual_level_1: 0,
        bond_residual_level_2: 0,
        bond_supreme_level_1: 0,
        bond_supreme_level_2: 0,
        bond_supreme_level_3: 0,
        bond_direct_starter_level_1: 0,
        bond_crypto_elite_level_1: 0,
        bond_crypto_elite_level_2: 0,
        bond_toprice_xpert_level_1: 0,
        bond_toprice_xpert_level_2: 0,
        profits_this_month: doc.profits_this_month + doc.total,
      });
    }

    if (['bitcoin', 'litecoin'].includes(blockchain)) {
      const wallet =
        blockchain == 'bitcoin' ? 'wallet_bitcoin' : 'wallet_litecoin';
      const requests = payroll_data.map((doc) => ({
        address: doc[wallet],
        amount: `${doc.crypto_amount}`,
      }));
      const requests_empty = requests.filter((r) => r.address);
      await this.cryptoapisService.sendRequestTransaction(
        requests_empty,
        blockchain as 'bitcoin' | 'litecoin',
      );
    }

    return payroll_data;
  }

  /**
   * Enviar transacción a cryptoapis usando un registro de payroll
   */
  async payrollFromPayroll(id: string, blockchain: Blockchains) {
    const payroll_data = await db
      .collection('payroll')
      .doc(id)
      .collection('details')
      .get();

    if (['bitcoin', 'litecoin'].includes(blockchain)) {
      const wallet =
        blockchain == 'bitcoin' ? 'wallet_bitcoin' : 'wallet_litecoin';

      const requests = await Promise.all(
        payroll_data.docs.map(async (doc) => {
          const user = await db.collection('users').doc(doc.get('id')).get();
          const amount =
            blockchain == 'bitcoin'
              ? await this.cryptoapisService.getBTCExchange(
                  Number(doc.get('total')),
                )
              : await this.cryptoapisService.getLTCExchange(
                  Number(doc.get('total')),
                );
          await doc.ref.update({
            [`total_${wallet}`]: amount || 0,
          });
          return {
            address: user.get(wallet),
            amount: amount?.toString() || 0,
          };
        }),
      );

      const requests_empty = requests.filter((r) => r.address && r.amount > 0);
      const res = await this.cryptoapisService.sendRequestTransaction(
        requests_empty,
        blockchain as 'bitcoin' | 'litecoin',
      );

      return res;
    }
  }

  /**
   * Calcular payroll real
   * Se usa para cuando se borra algun registro manual y hay que recalcular
   */
  async fixPayrollAmount(id: string) {
    const payroll_data = await db
      .collection('payroll')
      .doc(id)
      .collection('details')
      .get();

    const amount = payroll_data.docs.reduce(
      (a, b) => a + Number(b.get('total')),
      0,
    );

    return amount;
  }

  async withdraw(
    address: string,
    amount_usd: string,
    blockchain: 'bitcoin' | 'litecoin',
  ) {
    if (blockchain == 'bitcoin' || blockchain == 'litecoin') {
      return this.cryptoapisService.withdraw(address, amount_usd, blockchain);
    }
  }

  async regresardinero() {
    const snap = await db
      .collectionGroup('payroll')
      .where('created_at', '>=', dayjs('2023-10-29 00:00:00').toDate())
      .get();

    for (const doc of snap.docs) {
      if (doc.ref.path.includes('users')) {
        const get_bonds = (doc) => ({
          bond_direct: doc.get('direct'),
          bond_direct_second_level: doc.get('direct_second_level'),
          bond_residual_level_1: doc.get('residual'),
          bond_residual_level_2: doc.get('residual_second_level'),
          bond_supreme_level_1: doc.get('supreme'),
          bond_supreme_level_2: doc.get('supreme_second_level'),
          bond_supreme_level_3: doc.get('supreme_third_level'),
          bond_direct_starter_level_1: doc.get('bond_direct_starter_level_1'),
          bond_crypto_elite_level_1: doc.get('bond_crypto_elite_level_1'),
          bond_crypto_elite_level_2: doc.get('bond_crypto_elite_level_2'),
          bond_toprice_xpert_level_1: doc.get('bond_toprice_xpert_level_1'),
          bond_toprice_xpert_level_2: doc.get('bond_toprice_xpert_level_2'),
        });

        const bonds = get_bonds(doc);

        await doc.ref.parent.parent.update({
          bond_direct: firestore.FieldValue.increment(bonds.bond_direct),
          bond_direct_second_level: firestore.FieldValue.increment(
            bonds.bond_direct_second_level,
          ),
          bond_residual_level_1: firestore.FieldValue.increment(
            bonds.bond_residual_level_1,
          ),
          bond_residual_level_2: firestore.FieldValue.increment(
            bonds.bond_residual_level_2,
          ),
          bond_supreme_level_1: firestore.FieldValue.increment(
            bonds.bond_supreme_level_1,
          ),
          bond_supreme_level_2: firestore.FieldValue.increment(
            bonds.bond_supreme_level_2,
          ),
          bond_supreme_level_3: firestore.FieldValue.increment(
            bonds.bond_supreme_level_3,
          ),
          bond_direct_starter_level_1: firestore.FieldValue.increment(
            bonds.bond_direct_starter_level_1,
          ),
          bond_crypto_elite_level_1: firestore.FieldValue.increment(
            bonds.bond_crypto_elite_level_1,
          ),
          bond_crypto_elite_level_2: firestore.FieldValue.increment(
            bonds.bond_crypto_elite_level_2,
          ),
          bond_toprice_xpert_level_1: firestore.FieldValue.increment(
            bonds.bond_toprice_xpert_level_1,
          ),
          bond_toprice_xpert_level_2: firestore.FieldValue.increment(
            bonds.bond_toprice_xpert_level_2,
          ),
        });

        await doc.ref.delete();
      }
    }
  }

  async reduceWalletAmount(address: string, amount: number) {
    const addresses = await db
      .collection('wallets')
      .where('address', '==', address)
      .get();

    if (addresses.size > 0) {
      await addresses.docs[0].ref.collection('history').add({
        before: addresses.docs[0].data(),
        payload: {
          description: 'Withdraw',
          amount,
          created_at: new Date(),
        },
      });
      await addresses.docs[0].ref.update({
        amount: Number(addresses.docs[0].get('amount')) - amount,
        updated_at: new Date(),
      });
    }
  }

  async usersJson() {
    const res = await db.collection('users').get();
    const users = res.docs.map((r) => ({ id: r.id, ...r.data() }));
    fs.writeFileSync('users.json', JSON.stringify(users));
  }
}
