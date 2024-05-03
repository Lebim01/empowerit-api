import { Injectable } from '@nestjs/common';
import { db as admin } from '../firebase/admin';
import { UsersService } from 'src/users/users.service';
import { firestore } from 'firebase-admin';
import {
  BOND_CAR,
  Bonds,
  menthor_percent,
  messages,
  quick_start_percent,
} from './bonds';

@Injectable()
export class BondsService {
  constructor(private readonly userService: UsersService) {}

  /**
   * solo se reparte este bono a los usuarios activos
   */
  async execUserDirectBond(registerUserId: string, membership_price: number) {
    console.log('execUserDirectBond', { registerUserId }, { membership_price });
    const user = await admin.collection('users').doc(registerUserId).get();

    const sponsor_id = user.get('sponsor_id');
    const sponsorRef = admin.collection('users').doc(sponsor_id);
    const sponsor = await sponsorRef.get().then((r) => r.data());
    const sponsor_rank = sponsor.rank;
    const percent = quick_start_percent[sponsor_rank] / 100;

    // primer nivel
    if (sponsor) {
      const isProActive = await this.userService.isActiveUser(sponsor_id);

      const amount = Math.round(membership_price * percent * 100) / 100;

      if (isProActive) {
        await sponsorRef.update({
          [Bonds.QUICK_START]: firestore.FieldValue.increment(amount),
        });
        await this.addProfitDetail(
          sponsorRef.id,
          Bonds.QUICK_START,
          amount,
          user.id,
        );
      } else {
        await this.addLostProfit(
          sponsorRef.id,
          Bonds.QUICK_START,
          amount,
          user.id,
        );
      }
    }
  }

  async execMentorBond(
    sponsorId: string,
    directUserId: string,
    rank: string,
    binary_total: number,
  ) {
    const percent = menthor_percent[rank];

    const mentor_total = Number(
      Number(binary_total * (percent / 100)).toFixed(2),
    );

    await admin
      .collection('users')
      .doc(sponsorId)
      .update({
        [Bonds.MENTOR]: firestore.FieldValue.increment(mentor_total),
      });

    await this.addProfitDetail(
      sponsorId,
      Bonds.MENTOR,
      mentor_total,
      directUserId,
    );
  }

  async execCarBond(userId: string) {
    console.log('execCarBond', {
      userId,
    });
    await admin
      .collection('users')
      .doc(userId)
      .update({
        [Bonds.CAR]: firestore.FieldValue.increment(BOND_CAR),
      });

    await this.addProfitDetail(userId, Bonds.CAR, BOND_CAR);
  }

  async execBondPresenter(
    amount: number,
    registerUserId: string,
    presenter1: string,
    presenter2?: string,
  ) {
    const percent = (presenter2 ? 1 : 2) / 100;
    const total = Math.round(amount * percent * 100) / 100;

    const u_presenter_1 = await admin
      .collection('users')
      .where('presenter_code', '==', presenter1)
      .get();

    if (!u_presenter_1.empty) {
      await u_presenter_1.docs[0].ref.update({
        [Bonds.PRESENTER]: firestore.FieldValue.increment(total),
      });

      await this.addProfitDetail(
        u_presenter_1.docs[0].id,
        Bonds.PRESENTER,
        total,
        registerUserId,
      );
    }

    if (presenter2) {
      const u_presenter_2 = await admin
        .collection('users')
        .where('presenter_code', '==', presenter2)
        .get();

      if (!u_presenter_2.empty) {
        await u_presenter_2.docs[0].ref.update({
          [Bonds.PRESENTER]: firestore.FieldValue.increment(total),
        });

        await this.addProfitDetail(
          u_presenter_2.docs[0].id,
          Bonds.PRESENTER,
          total,
          registerUserId,
        );
      }
    }
  }

  async execPresenterBonus(
    registerUserId: string,
    userId: string,
    total: number,
  ) {
    await this.addProfitDetail(userId, Bonds.PRESENTER, total, registerUserId);
    await admin
      .collection('users')
      .doc(userId)
      .update({
        bond_presenter: firestore.FieldValue.increment(total),
      });
  }

  async addProfitDetail(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId?: string,
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
      .add(profit);
  }

  async addLostProfit(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId: string,
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
}
