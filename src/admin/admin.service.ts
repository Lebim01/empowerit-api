import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import { CryptoapisService } from '../cryptoapis/cryptoapis.service';
import { ranks_object } from '../ranks/ranks_object';
import { BinaryService } from '../binary/binary.service';
import dayjs from 'dayjs';
import { firestore } from 'firebase-admin';

const ADMIN_BINARY_PERCENT = 17 / 100;

@Injectable()
export class AdminService {
  constructor(
    private readonly cryptoapisService: CryptoapisService,
    private readonly binaryService: BinaryService,
  ) {}

  async getPayroll(blockchain: 'bitcoin' | 'xrp') {
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
        const isAdmin =
          Boolean(docData.is_admin) || docData.type == 'top-lider';
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
          scholarship: docData.bond_scholarship_level_1 || 0,
          scholarship_second_level: docData.bond_scholarship_level_2 || 0,
          scholarship_third_level: docData.bond_scholarship_level_3 || 0,
          supreme: docData.bond_supreme_level_1 || 0,
          supreme_second_level: docData.bond_supreme_level_2 || 0,
          supreme_third_level: docData.bond_supreme_level_3 || 0,
          bond_direct_starter_level_1: docData.bond_direct_starter_level_1 || 0,
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
          wallet_ripple: docData.wallet_ripple,
          wallet_ripple_tag: docData.wallet_ripple_tag,
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
          doc.scholarship +
          doc.scholarship_second_level +
          doc.scholarship_third_level +
          doc.supreme +
          doc.supreme_second_level +
          doc.supreme_third_level +
          doc.bond_direct_starter_level_1,
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
      .filter((doc) => Boolean(doc.wallet_bitcoin));

    const payroll_data_2 = await Promise.all(
      payroll_data.map(async (doc) => ({
        ...doc,
        crypto_amount:
          blockchain == 'bitcoin'
            ? await this.cryptoapisService.getBTCExchange(doc.total)
            : blockchain == 'xrp'
            ? await this.cryptoapisService.getXRPExchange(doc.total)
            : 0,
      })),
    );

    return payroll_data_2;
  }

  async payroll(blockchain: 'bitcoin' | 'xrp') {
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
        bond_scholarship_level_1: 0,
        bond_scholarship_level_2: 0,
        bond_scholarship_level_3: 0,
        bond_supreme_level_1: 0,
        bond_supreme_level_2: 0,
        bond_supreme_level_3: 0,
        bond_direct_starter_level_1: 0,
        profits_this_month: doc.profits_this_month + doc.total,
      });
    }

    if (blockchain == 'bitcoin') {
      await this.cryptoapisService.sendRequestTransaction(
        payroll_data.map((doc) => ({
          address: doc.wallet_bitcoin,
          amount: `${doc.crypto_amount}`,
        })),
      );
    } else if (blockchain == 'xrp') {
      await this.payrollWithXRP(
        payroll_data.map((doc) => ({
          address: doc.wallet_ripple,
          tag: doc.wallet_ripple_tag,
          amount: doc.total,
        })),
      );
    }

    return payroll_data;
  }

  async payrollWithXRP(
    payroll_users: { address: string; tag: string; amount: number }[],
  ) {
    const total = payroll_users.reduce((a, b) => a + b.amount, 0);
    const wallets_to_pay = await this.getXRPWalletsToUse(total);

    const wallets_users = [];

    for (const user of payroll_users) {
      let total_remaing = user.amount;
      const user_address = {
        ...user,
        addresses: [],
      };

      while (total_remaing > 0) {
        const index = wallets_to_pay.findIndex((w) => w.amount > 0);
        const wallet_to_extract = wallets_to_pay[index];

        const from_wallet_to_pay = {
          address: wallet_to_extract.address,
          amount_to_transfer: 0,
        };

        if (wallet_to_extract.amount >= total_remaing) {
          from_wallet_to_pay.amount_to_transfer = total_remaing;
          wallets_to_pay[index].amount =
            wallet_to_extract.amount - total_remaing;
          total_remaing = 0;
        } else {
          from_wallet_to_pay.amount_to_transfer = wallet_to_extract.amount;
          total_remaing -= wallet_to_extract.amount;
          wallets_to_pay[index].amount = 0;
        }

        user_address.addresses.push(from_wallet_to_pay);
      }

      wallets_users.push(user_address);
    }

    for (const wu of wallets_users) {
      console.log(wu);
      for (const address of wu.addresses) {
        try {
          await this.cryptoapisService.sendXRPTransactionFromAddress(
            wu.address,
            wu.tag,
            address.address,
            address.amount_to_transfer.toFixed(6),
          );
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  /**
   * Obtiene un arreglo de wallets con el dinero suficiente para pagar
   */
  async getXRPWalletsToUse(total: number) {
    const wallets = await db
      .collection('wallets')
      .where('currency', '==', 'XRP')
      .where('amount', '>', 0)
      .get();

    let amount = 0;
    const wallets_to_use = [];
    for (const wallet of wallets.docs) {
      amount += wallet.get('amount');
      wallets_to_use.push(wallet.data());

      if (amount >= total) break;
    }

    return wallets_to_use;
  }

  /**
   * Enviar transacción a cryptoapis usando un registro de payroll
   */
  async payrollFromPayroll(id: string, blockchain: 'bitcoin' | 'xrp') {
    const payroll_data = await db
      .collection('payroll')
      .doc(id)
      .collection('details')
      .get();

    if (blockchain == 'bitcoin') {
      const res = await this.cryptoapisService.sendRequestTransaction(
        payroll_data.docs.map((doc) => ({
          address: doc.get('wallet_bitcoin'),
          amount: `${doc.get('crypto_amount')}`,
        })),
      );
      return res;
    } else if (blockchain == 'xrp') {
      const wallets = await Promise.all(
        payroll_data.docs.map(async (doc) => {
          const user = await db.collection('users').doc(doc.get('id')).get();
          const total_xrp = await this.cryptoapisService.getXRPExchange(
            doc.get('total'),
          );
          return {
            address: user.get('wallet_ripple'),
            tag: user.get('wallet_ripple_tag'),
            amount: total_xrp,
          };
        }),
      );
      await this.payrollWithXRP(wallets);
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

  withdraw(address: string, amount: string) {
    return this.cryptoapisService.withdraw(address, amount);
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
          bond_scholarship_level_1: doc.get('scholarship'),
          bond_scholarship_level_2: doc.get('scholarship_second_level'),
          bond_scholarship_level_3: doc.get('scholarship_third_level'),
          bond_supreme_level_1: doc.get('supreme'),
          bond_supreme_level_2: doc.get('supreme_second_level'),
          bond_supreme_level_3: doc.get('supreme_third_level'),
          bond_direct_starter_level_1: doc.get('bond_direct_starter_level_1'),
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
          bond_scholarship_level_1: firestore.FieldValue.increment(
            bonds.bond_scholarship_level_1,
          ),
          bond_scholarship_level_2: firestore.FieldValue.increment(
            bonds.bond_scholarship_level_2,
          ),
          bond_scholarship_level_3: firestore.FieldValue.increment(
            bonds.bond_scholarship_level_3,
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
      await addresses.docs[0].ref.update({
        amount: firestore.FieldValue.increment(amount * -1),
      });
    }
  }
}
