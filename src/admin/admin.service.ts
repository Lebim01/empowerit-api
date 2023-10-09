import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import { CryptoapisService } from '../cryptoapis/cryptoapis.service';
import { ranks_object } from '../ranks/ranks_object';
import { BinaryService } from '../binary/binary.service';

const ADMIN_BINARY_PERCENT = 17 / 100;

@Injectable()
export class AdminService {
  constructor(
    private readonly cryptoapisService: CryptoapisService,
    private readonly binaryService: BinaryService,
  ) {}

  async getPayroll() {
    const users = await db.collection('users').get();
    const docs = users.docs.map((r) => ({ id: r.id, ...r.data() }));

    const payroll_data = docs
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
          doc.supreme_third_level,
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
        btc_amount: await this.cryptoapisService.getBTCExchange(doc.total),
      })),
    );

    return payroll_data_2;
  }

  async payroll() {
    const payroll_data = await this.getPayroll();

    const ref = await db.collection('payroll').add({
      total_usd: payroll_data.reduce((a, b) => a + b.total, 0),
      total_btc: payroll_data.reduce((a, b) => a + b.btc_amount, 0),
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
        profits_this_month: doc.profits_this_month + doc.total,
      });
    }

    await this.cryptoapisService.sendRequestTransaction(
      payroll_data.map((doc) => ({
        address: doc.wallet_bitcoin,
        amount: `${doc.btc_amount}`,
      })),
    );

    return payroll_data;
  }

  async payrollFromPayroll(id: string) {
    const payroll_data = await db
      .collection('payroll')
      .doc(id)
      .collection('details')
      .get();

    const res = await this.cryptoapisService.sendRequestTransaction(
      payroll_data.docs.map((doc) => ({
        address: doc.get('wallet_bitcoin'),
        amount: `${doc.get('btc_amount')}`,
      })),
    );

    return res;
  }

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
}
