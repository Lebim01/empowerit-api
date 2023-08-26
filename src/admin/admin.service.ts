import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import { CryptoapisService } from '@/cryptoapis/cryptoapis.service';

@Injectable()
export class AdminService {
  constructor(private readonly cryptoapisService: CryptoapisService) {}

  async payroll() {
    const users = await db.collection('users').get();
    const docs = users.docs.map((r) => ({ id: r.id, ...r.data() }));

    const binary_15 = [
      'IC2DFTuYg9aT9KqOEvDjI34Hk0E3',
      '7iRezG7E6vRq7OQywQN3WawSa872',
    ];

    const payroll_data = docs
      .map((docData: any) => {
        const binary_side =
          docData.left_points > docData.right_points ? 'right' : 'left';
        const binary_points = docData[`${binary_side}_points`];
        return {
          id: docData.id,
          name: docData.name,
          direct: docData.bond_direct || 0,
          direct_second_level: docData.bond_direct_second_level || 0,
          binary: binary_points * (binary_15.includes(docData.id) ? 0.15 : 0.1),
          binary_side,
          binary_points,
          left_points: docData.left_points,
          right_points: docData.right_points,
          wallet_bitcoin: docData.wallet_bitcoin,
          profits: docData.profits || 0,
        };
      })
      .map((doc) => ({
        ...doc,
        subtotal: doc.direct + doc.binary + doc.direct_second_level,
      }))
      .map((doc) => ({
        ...doc,
        fee: doc.subtotal * 0.05,
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

    const ref = await db.collection('payroll').add({
      total_usd: payroll_data_2.reduce((a, b) => a + b.total, 0),
      total_btc: payroll_data_2.reduce((a, b) => a + b.btc_amount, 0),
      created_at: new Date(),
    });
    await Promise.all(
      payroll_data_2.map(async (doc) => {
        await ref.collection('details').add(doc);
        await db.collection(`users/${doc.id}/payroll`).add({
          ...doc,
          created_at: new Date(),
        });
      }),
    );

    for (const doc of payroll_data_2) {
      await db.doc('users/' + doc.id).update({
        profits: doc.profits + doc.total,
        bond_direct: 0,
        bond_direct_second_level: 0,
        left_points: doc.left_points - doc.binary_points,
        right_points: doc.right_points - doc.binary_points,
      });
    }

    /*await cryptoapis.sendCoins(
    payroll_data_2.map((doc) => ({
      address: doc.wallet_bitcoin,
      amount: `${doc.btc_amount}`,
    }))
  );*/

    return payroll_data_2;
  }
}
