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
  quick_start_percent_by_Franchise,
} from './bonds';
import { Ranks } from 'src/ranks/ranks_object';

export async function availableCap(registerUserId: string, cash: number) {
  const user = await admin.collection('users').doc(registerUserId).get();
  const membership_cap_current = user.get('membership_cap_current');
  const membership_cap_limit = user.get('membership_cap_limit');
  if (cash <= membership_cap_limit - membership_cap_current) {
    return cash;
  }
  return membership_cap_limit - membership_cap_current;
}

@Injectable()
export class BondsService {
  constructor(private readonly userService: UsersService) {}

  /**
   * solo se reparte este bono a los usuarios activos
   */
  async execUserDirectBond(
    registerUserId: string,
    membership_price: number,
    isParticipation = false,
  ) {
    console.log('execUserDirectBond', { registerUserId }, { membership_price });
    const user = await admin.collection('users').doc(registerUserId).get();

    const sponsor_id = user.get('sponsor_id');
    const sponsorRef = admin.collection('users').doc(sponsor_id);
    const sponsor = await sponsorRef.get().then((r) => r.data());
    let percent = 0;
    const is_new_pack = [
      '100-pack',
      '300-pack',
      '500-pack',
      '1000-pack',
      '2000-pack',
      '3000-pack',
    ].includes(sponsor.membership);
    console.log(sponsor.membership, { is_new_pack });
    if (isParticipation) {
      percent = 5 / 100;
    } else {
      if (is_new_pack) {
        if (user.get('membership') == '3000-pack') {
          percent = 10 / 100;
        } else {
          const sponsor_membership = sponsor.membership as Memberships;
          percent = quick_start_percent_by_Franchise[sponsor_membership] / 100;
        }
      } else {
        const sponsor_rank = sponsor.rank as Ranks;
        percent = quick_start_percent[sponsor_rank] / 100;
      }
    }

    // primer nivel
    if (sponsor) {
      const isProActive = await this.userService.isActiveUser(sponsor_id);
      const amount = Math.round(membership_price * percent * 100) / 100;
      let availableAmount = amount;
      if (is_new_pack) {
        availableAmount = await availableCap(sponsor_id, amount);
      }

      /* Aqui */
      if (isProActive) {
        if (is_new_pack) {
          await sponsorRef.update({
            [Bonds.QUICK_START]:
              firestore.FieldValue.increment(availableAmount),
            /* membership_cap_current:
              firestore.FieldValue.increment(availableAmount), */
          });
        } else {
          await sponsorRef.update({
            [Bonds.QUICK_START]:
              firestore.FieldValue.increment(availableAmount),
          });
        }
        await this.addProfitDetail(
          sponsorRef.id,
          Bonds.QUICK_START,
          availableAmount,
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
    const availableAmount = await availableCap(sponsorId, mentor_total);

    await admin
      .collection('users')
      .doc(sponsorId)
      .update({
        [Bonds.MENTOR]: firestore.FieldValue.increment(availableAmount),
      });

    await this.addProfitDetail(
      sponsorId,
      Bonds.MENTOR,
      availableAmount,
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

    if (presenter1) {
      const u_presenter_1 = await admin
        .collection('users')
        .doc(presenter1)
        .get();

      if (u_presenter_1.exists) {
        const is_new_pack = [
          '100-pack',
          '300-pack',
          '500-pack',
          '1000-pack',
          '2000-pack',
        ].includes(u_presenter_1.get('membership'));
        let availableAmount = total;
        if (is_new_pack) {
          availableAmount = await availableCap(u_presenter_1.id, total);
        }

        if (is_new_pack) {
          await u_presenter_1.ref.update({
            [Bonds.PRESENTER]: firestore.FieldValue.increment(availableAmount),
            /* membership_cap_current:
              firestore.FieldValue.increment(availableAmount), */
          });
        } else {
          await u_presenter_1.ref.update({
            [Bonds.PRESENTER]: firestore.FieldValue.increment(availableAmount),
          });
        }

        await this.addProfitDetail(
          u_presenter_1.id,
          Bonds.PRESENTER,
          availableAmount,
          registerUserId,
        );
      }
    }

    if (presenter2) {
      const u_presenter_2 = await admin
        .collection('users')
        .doc(presenter2)
        .get();

      if (u_presenter_2.exists) {
        const is_new_pack = [
          '100-pack',
          '300-pack',
          '500-pack',
          '1000-pack',
          '2000-pack',
        ].includes(u_presenter_2.get('membership'));
        let availableAmount = total;
        if (is_new_pack) {
          availableAmount = await availableCap(u_presenter_2.id, total);
        }
        if (is_new_pack) {
          await u_presenter_2.ref.update({
            [Bonds.PRESENTER]: firestore.FieldValue.increment(availableAmount),
            /* membership_cap_current:
              firestore.FieldValue.increment(availableAmount), */
          });
        } else {
          await u_presenter_2.ref.update({
            [Bonds.PRESENTER]: firestore.FieldValue.increment(availableAmount),
          });
        }

        await this.addProfitDetail(
          u_presenter_2.id,
          Bonds.PRESENTER,
          availableAmount,
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
    const availableAmount = await availableCap(userId, total);
    const userIdDoc = await admin.collection('users').doc(userId).get();
    const is_new_pack = [
      '100-pack',
      '300-pack',
      '500-pack',
      '1000-pack',
      '2000-pack',
    ].includes(userIdDoc.get('membership'));

    await this.addProfitDetail(
      userId,
      Bonds.PRESENTER,
      availableAmount,
      registerUserId,
    );
    if (is_new_pack) {
      await admin
        .collection('users')
        .doc(userId)
        .update({
          bond_presenter: firestore.FieldValue.increment(availableAmount),
          /* membership_cap_current:
            firestore.FieldValue.increment(availableAmount), */
        });
    } else {
      await admin
        .collection('users')
        .doc(userId)
        .update({
          bond_presenter: firestore.FieldValue.increment(availableAmount),
        });
    }
    return 'OK';
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
