import { Injectable } from '@nestjs/common';
import { increment } from 'firebase/firestore';
import { db as admin } from '../firebase/admin';
import { UsersService } from 'src/users/users.service';
import { firestore } from 'firebase-admin';
import { Ranks } from 'src/ranks/ranks_object';

enum Bonds {
  PRESENTER = 'bond_presenter',
  QUICK_START = 'bond_quick_start',
  MENTOR = 'bond_mentor',
  CAR = 'bond_car',
  DIRECT_SALE = 'bond_direct_sale',
}

/**
 * Porcentaje de ganancia bono inicio rapido
 */
const quick_start_percent: Record<Ranks, number> = {
  initial_builder: 20,
  star_builder: 20,
  advanced_builder: 20,
  master_1000: 20,
  master_1500: 20,
  master_2500: 20,
  regional_director: 20,
  national_director: 20,
  international_director: 20,
  top_diamond: 25,
  top_1: 25,
  top_legend: 30,
  none: 0,
};

/**
 * Porcentaje de ganancia bono mentor
 */
const menthor_percent: Record<Ranks, number> = {
  initial_builder: 10,
  star_builder: 10,
  advanced_builder: 10,
  master_1000: 15,
  master_1500: 15,
  master_2500: 15,
  regional_director: 20,
  national_director: 20,
  international_director: 20,
  top_diamond: 30,
  top_1: 30,
  top_legend: 30,
  none: 0,
};

const BOND_CAR = 250;

const messages: Record<Bonds, string> = {
  bond_quick_start: 'Bono de inicio rápido',
  bond_mentor: 'Bono Mentor',
  bond_car: 'Bono Auto',
  bond_direct_sale: 'Bono venta directa',
  bond_presenter: 'Bono presentador',
};

@Injectable()
export class BondsService {
  constructor(private readonly userService: UsersService) {}

  /**
   * solo se reparte este bono a los usuarios activos
   */
  async execUserDirectBond(registerUserId: string, membership_price: number) {
    const user = await admin.collection('users').doc(registerUserId).get();

    const sponsor_id = user.get('sponsor_id');
    const sponsorRef = admin.collection('users').doc(sponsor_id);
    const sponsor = await sponsorRef.get().then((r) => r.data());
    const sponsor_rank = sponsor.rank;
    const percent = quick_start_percent[sponsor_rank] / 100;

    // primer nivel
    if (sponsor) {
      const isProActive = await this.userService.isActiveUser(sponsor_id);

      const amount = membership_price * percent;

      if (isProActive) {
        await sponsorRef.update({
          [Bonds.QUICK_START]: increment(amount),
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
    const total = amount * percent;

    await admin
      .collection('users')
      .doc(presenter1)
      .update({
        [Bonds.PRESENTER]: firestore.FieldValue.increment(total),
      });

    await this.addProfitDetail(
      presenter1,
      Bonds.PRESENTER,
      total,
      registerUserId,
    );

    if (presenter2) {
      await admin
        .collection('users')
        .doc(presenter2)
        .update({
          [Bonds.PRESENTER]: firestore.FieldValue.increment(total),
        });

      await this.addProfitDetail(
        presenter2,
        Bonds.PRESENTER,
        total,
        registerUserId,
      );
    }
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
