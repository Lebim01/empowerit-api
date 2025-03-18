import { Injectable } from '@nestjs/common';
import { db as admin } from '../firebase/admin';
import { UsersService } from 'src/users/users.service';
import { firestore } from 'firebase-admin';
import { Bonds, menthor_percent, messages } from './bonds';
import { MEMBERSHIPS_PRICES } from 'src/constants';
import { Ranks, ranks_object } from 'src/ranks/ranks_object';

@Injectable()
export class BondsService {
  constructor(private readonly userService: UsersService) {}

  async addBond(
    user_id: string, // usuario que recibe el bono
    type: Bonds,
    amount: number,
    user_origin_bond?: string, // usuario que detonó el bono
    add_to_balance = false,
    extras?: Record<string, any>,
  ) {
    const user = await admin.collection('users').doc(user_id).get();
    const isActive = this.userService.isActiveUserByDoc(user);

    if (isActive) {
      const update: any = {};

      if (add_to_balance) {
        update.balance = firestore.FieldValue.increment(amount);
      }

      await admin
        .collection('users')
        .doc(user_id)
        .update({
          [type]: firestore.FieldValue.increment(amount),
          profits: firestore.FieldValue.increment(amount),
          ...update,
        });
      await this.addProfitDetail(user_id, type, amount, user_origin_bond, {
        ...extras,
        benefited_user_name: user.get('name'),
      });
    } else {
      await this.addLostProfit(user_id, type, amount, user_origin_bond);
    }
  }

  /**
   * solo se reparte este bono a los usuarios activos
   */
  async execUserDirectBond(
    registerUserId: string,
    membership_type: Memberships | PackParticipations,
  ) {
    console.log('execUserDirectBond', { registerUserId }, { membership_type });
    const membership_price = MEMBERSHIPS_PRICES[membership_type];
    const user = await admin.collection('users').doc(registerUserId).get();

    const sponsor_id = user.get('sponsor_id');

    const percent = ['FP1200', 'FP2400'].includes(membership_type) ? 0.1 : 0.2;
    const amount = membership_price * percent;

    await this.addBond(
      sponsor_id,
      Bonds.DIRECT_SALE,
      amount,
      registerUserId,
      true,
      {
        percent,
        membership_type,
      },
    );
  }

  async execMentorBond(
    sponsorId: string,
    directUserId: string,
    rank: string,
    binary_total: number,
  ) {
    //
  }

  async execRank(id_user: string, rank: Ranks) {
    await this.addBond(
      id_user,
      Bonds.RANK,
      ranks_object[rank].bonus,
      null,
      true,
      {
        rank,
      },
    );
  }

  async addProfitDetail(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId?: string,
    extras?: Record<string, any>,
  ) {
    const profit: any = {
      description: messages[type],
      amount,
      created_at: new Date(),
      type,
    };

    if (registerUserId) {
      const userRef = await admin.collection('users').doc(registerUserId).get();
      const user_name = userRef.get('name');
      profit.user_name = user_name;
      profit.id_user = registerUserId;
    }

    await admin
      .collection('users')
      .doc(id_user)
      .collection('profits_details')
      .add({ ...profit, ...extras });
  }

  async addLostProfit(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId: string,
    extras?: Record<string, any>,
  ) {
    const userRef = await admin.collection('users').doc(registerUserId).get();
    const user_name = userRef.get('name');
    await admin
      .collection('users')
      .doc(id_user)
      .collection('lost_profits')
      .add({
        description: 'Has perdido un bono por membresia inactiva',
        id_user: registerUserId,
        user_name,
        amount,
        created_at: new Date(),
        type,
        ...extras,
      });
  }

  async resetUserProfits(id_user: string) {
    const bonds = Object.keys(messages).reduce((a, key) => {
      a[key] = 0;
      return a;
    }, {});
    await admin.collection('users').doc(id_user).update(bonds);
  }

  async getSponsor(user_id: string) {
    const user = await admin.collection('users').doc(user_id).get();
    const sponsor_id = user.get('sponsor_id');
    const sponsor = await admin.collection('users').doc(sponsor_id).get();

    return {
      id: sponsor_id,
      ref: sponsor.ref,
      data: sponsor,
    };
  }

  async execBinary(
    id_user: string,
    amount: number,
    extras?: Record<string, any>,
  ) {
    await this.addBond(id_user, Bonds.BINARY, amount, null, true, extras);
  }
}
