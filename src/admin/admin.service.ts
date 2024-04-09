import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import { CryptoapisService } from '../cryptoapis/cryptoapis.service';
import { BinaryService } from '../binary/binary.service';
import fs from 'fs';
import { pack_binary } from 'src/binary/binary_packs';

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
      .map((docData: any) => {
        const isAdmin = docData.type == 'top-lider';
        const binary_side =
          docData.left_points > docData.right_points ? 'right' : 'left';
        const binary_points = docData[`${binary_side}_points`];
        const binary_percent = isAdmin
          ? ADMIN_BINARY_PERCENT
          : pack_binary[docData.membership];

        return {
          id: docData.id,
          name: docData.name,
          bond_quick_start: docData.bond_quick_start || 0,
          bond_direct_sale: docData.bond_direct_sale || 0,
          bond_mentor: docData.bond_mentor || 0,
          bond_presenter: docData.bond_presenter || 0,
          bond_car: docData.bond_car || 0,
          bond_binary: Math.floor(binary_points * binary_percent * 100) / 100,
          binary_percent,
          binary_side,
          binary_points,
          left_points: docData.left_points,
          right_points: docData.right_points,
          wallet_litecoin: docData.wallet_litecoin || '',
          profits: docData.profits || 0,
          rank: docData.rank,
          profits_this_month: docData.profits_this_month || 0,
        };
      })
      .map((doc) => ({
        ...doc,
        subtotal:
          doc.bond_quick_start +
          doc.bond_direct_sale +
          doc.bond_mentor +
          doc.bond_presenter +
          doc.bond_binary,
      }))
      .map((doc) => ({
        ...doc,
        fee: Math.ceil(doc.subtotal * 0.05 * 100) / 100,
      }))
      .map((doc) => ({
        ...doc,
        total: doc.subtotal - doc.fee,
      }))
      .filter((doc) => doc.total > 0);

    const payroll_data_2 = await Promise.all(
      payroll_data.map(async (doc) => ({
        ...doc,
        crypto_amount: await this.cryptoapisService.getLTCExchange(doc.total),
      })),
    );

    return payroll_data_2;
  }

  async payroll(blockchain: Blockchains) {
    const payroll_data = await this.getPayroll(blockchain);

    const clean_payroll_data = payroll_data
      .filter((doc) => doc.total >= 40)
      .filter((doc) => Boolean(doc.wallet_litecoin));

    const ref = await db.collection('payroll').add({
      total_usd: clean_payroll_data.reduce((a, b) => a + b.total, 0),
      total_btc: clean_payroll_data.reduce((a, b) => a + b.crypto_amount, 0),
      created_at: new Date(),
    });
    await Promise.all(
      clean_payroll_data.map(async (doc) => {
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

    for (const doc of clean_payroll_data) {
      await db.doc('users/' + doc.id).update({
        profits: doc.profits + doc.total,
        bond_quick_start: 0,
        bond_direct_sale: 0,
        bond_mentor: 0,
        bond_presenter: 0,
        profits_this_month: doc.profits_this_month + doc.total,
      });
    }

    if (['bitcoin', 'litecoin'].includes(blockchain)) {
      const wallet =
        blockchain == 'bitcoin' ? 'wallet_bitcoin' : 'wallet_litecoin';
      const requests = clean_payroll_data.map((doc) => ({
        address: doc[wallet],
        amount: `${doc.crypto_amount}`,
      }));
      const requests_empty = requests.filter((r) => r.address);
      await this.cryptoapisService.sendRequestTransaction(
        requests_empty,
        blockchain as 'bitcoin' | 'litecoin',
      );
    }

    return clean_payroll_data;
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
