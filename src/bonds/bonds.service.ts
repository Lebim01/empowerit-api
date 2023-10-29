import { Injectable } from '@nestjs/common';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { db as admin } from '../firebase/admin';
import { UsersService } from 'src/users/users.service';
import * as Sentry from '@sentry/node';
import { firestore } from 'firebase-admin';

const messages = {
  bond_direct_level_1: 'Bono directo primer nivel',
  bond_direct_level_2: 'Bono directo segundo nivel',
  bond_residual_level_1: 'Bono residual primer nivel',
  bond_residual_level_2: 'Bono residual segundo nivel',
  bond_supreme_level_1: 'Bono supreme primer nivel',
  bond_supreme_level_2: 'Bono supreme segundo nivel',
  bond_supreme_level_3: 'Bono supreme tercel nivel',
  bond_scholarship_level_1: 'Bono beca primer nivel',
  bond_scholarship_level_2: 'Bono beca segundo nivel',
  bond_scholarship_level_3: 'Bono beca tercer nivel',
  bond_direct_starter_level_1: 'Bono directo starter primer nivel',
};
type Messages = typeof messages;
type Types = keyof Messages;

@Injectable()
export class BondsService {
  constructor(private readonly userService: UsersService) {}

  /**
   * solo se reparte este bono a los usuarios activos
   */
  async execUserDirectBond(registerUserId: string) {
    const user = await getDoc(doc(db, `users/${registerUserId}`));

    const sponsor_id = user.get('sponsor_id');
    const sponsorRef = doc(db, `users/${sponsor_id}`);
    const sponsor = await getDoc(sponsorRef).then((r) => r.data());

    // primer nivel
    if (sponsor) {
      const isStarterActive = await this.userService.isStarterActiveUser(
        sponsor_id,
      );
      const isProActive = await this.userService.isProActiveUser(sponsor_id);
      const isIBOActive = await this.userService.isIBOActive(sponsor_id);
      const amount = 50;

      if ((isStarterActive || isProActive) && isIBOActive) {
        await updateDoc(sponsorRef, {
          bond_direct: increment(amount),
        });
        await this.addProfitDetail(
          sponsorRef.id,
          'bond_direct_level_1',
          amount,
          user.id,
        );
      } else {
        await this.addLostProfit(
          sponsorRef.id,
          'bond_direct_level_1',
          amount,
          user.id,
        );
      }
    }

    // segundo nivel
    if (sponsor && sponsor.sponsor_id) {
      const sponsor2Ref = doc(db, `users/${sponsor.sponsor_id}`);
      const isActive = await this.userService.isProActiveUser(sponsor2Ref.id);
      const isIBOActive = await this.userService.isIBOActive(sponsor2Ref.id);
      const amount = 10;

      if (isActive && isIBOActive) {
        await updateDoc(sponsor2Ref, {
          bond_direct_second_level: increment(amount),
        });
        await this.addProfitDetail(
          sponsor2Ref.id,
          'bond_direct_level_2',
          amount,
          user.id,
        );
      } else {
        await this.addLostProfit(
          sponsor2Ref.id,
          'bond_direct_level_2',
          amount,
          user.id,
        );
      }
    }
  }

  async execUserResidualBond(registerUserId: string) {
    const user = await getDoc(doc(db, `users/${registerUserId}`));

    const sponsor_id = user.get('sponsor_id');
    const sponsorRef = doc(db, `users/${sponsor_id}`);
    const sponsor = await getDoc(sponsorRef).then((r) => r.data());

    // primer nivel
    if (sponsor) {
      const isProActive = await this.userService.isProActiveUser(sponsorRef.id);
      const isIBOActive = await this.userService.isIBOActive(sponsorRef.id);
      const amount = sponsor && sponsor.sponsor_id ? 30 : 50;

      if (isProActive && isIBOActive) {
        await updateDoc(sponsorRef, {
          bond_residual_level_1: increment(amount),
        });
        await this.addProfitDetail(
          sponsorRef.id,
          'bond_residual_level_1',
          amount,
          user.id,
        );
      } else {
        await this.addLostProfit(
          sponsorRef.id,
          'bond_residual_level_1',
          amount,
          user.id,
        );
      }
    }

    // segundo nivel
    if (sponsor && sponsor.sponsor_id) {
      const sponsor2Ref = doc(db, `users/${sponsor.sponsor_id}`);
      const isActive = await this.userService.isProActiveUser(sponsor2Ref.id);
      const isIBOActive = await this.userService.isIBOActive(sponsor2Ref.id);
      const amount = 20;

      if (isActive && isIBOActive) {
        await updateDoc(sponsor2Ref, {
          bond_residual_level_2: increment(amount),
        });
        await this.addProfitDetail(
          sponsor2Ref.id,
          'bond_residual_level_2',
          amount,
          user.id,
        );
      } else {
        await this.addLostProfit(
          sponsor2Ref.id,
          'bond_residual_level_2',
          amount,
          user.id,
        );
      }
    }
  }

  async execSupremeBond(id_user: string) {
    const userRef = await admin.collection('users').doc(id_user).get();

    // Comprobar que el usuario tenga sponsor
    const id_sponsor = userRef.get('sponsor_id');
    if (!id_sponsor) {
      console.log(
        '\x1b[33m%s\x1b[0m',
        `El usuario ${userRef.get('email')} no cuenta con un patrocinador.`,
      );
      return;
    }

    const sponsorRef = admin.collection('users').doc(id_sponsor);
    const sponsor = await sponsorRef.get();
    const sequence = Number(sponsor.get('supreme_sequence') ?? 0);

    let nextBond = sequence + 1;
    if (nextBond > 3) {
      nextBond = 1;
    }

    switch (nextBond) {
      case 1:
        const is_active = await this.userService.isSupremeActive(sponsor.id);
        // El usuario debe ser supreme tambien
        if (is_active) {
          const amount = 100;
          await sponsorRef.update({
            bond_supreme_level_1: firestore.FieldValue.increment(amount),
          });
          await this.addProfitDetail(
            sponsorRef.id,
            'bond_supreme_level_1',
            amount,
            userRef.id,
          );
        }
        break;
      case 2:
      case 3:
        try {
          const is_active = await this.userService.isSupremeActive(
            sponsorRef.id,
          );
          // El usuario debe ser supreme tambien
          if (is_active) {
            const amount = 50;
            await sponsorRef.update({
              bond_supreme_level_1: firestore.FieldValue.increment(amount),
            });
            await this.addProfitDetail(
              sponsorRef.id,
              'bond_supreme_level_1',
              amount,
              userRef.id,
            );
          }

          const sponsor2Ref = admin
            .collection('users')
            .doc(sponsor.get('sponsor_id'));
          const sponsor2 = await sponsor2Ref.get();
          const is_active_2 = await this.userService.isSupremeActive(
            sponsor2Ref.id,
          );
          // El usuario debe ser supreme tambien
          if (is_active_2) {
            const amount = 20;
            await sponsor2Ref.update({
              bond_supreme_level_2: firestore.FieldValue.increment(amount),
            });
            await this.addProfitDetail(
              sponsor2Ref.id,
              'bond_supreme_level_2',
              amount,
              userRef.id,
            );
          }

          const sponsor3Ref = admin
            .collection('users')
            .doc(sponsor2.get('sponsor_id'));
          const is_active_3 = await this.userService.isSupremeActive(
            sponsor3Ref.id,
          );
          // El usuario debe ser supreme tambien
          if (is_active_3) {
            const amount = 10;
            await sponsor3Ref.update({
              bond_supreme_level_3: firestore.FieldValue.increment(amount),
            });
            await this.addProfitDetail(
              sponsor3Ref.id,
              'bond_supreme_level_3',
              amount,
              userRef.id,
            );
          }
        } catch (err) {
          Sentry.configureScope((scope) => {
            scope.setExtra('id_user', id_user);
            scope.setExtra('message', 'no se pudo repartir el bono supreme');
            Sentry.captureException(err);
          });
        }
        break;
      default:
        break;
    }

    await sponsorRef.update({
      supreme_sequence: nextBond,
    });
  }

  async execStarterBond(registerUserId: string) {
    const user = await admin.collection('users').doc(registerUserId).get();

    const sponsor_id = user.get('sponsor_id');
    const sponsorRef = admin.collection('users').doc(sponsor_id);
    const sponsor = await sponsorRef.get().then((r) => r.data());

    // primer nivel
    if (sponsor) {
      const isStarterActive = await this.userService.isStarterActiveUser(
        sponsor_id,
      );
      const isProActive = await this.userService.isProActiveUser(sponsor_id);
      const isIBOActive = await this.userService.isIBOActive(sponsor_id);
      const amount = 20;

      if ((isProActive || isStarterActive) && isIBOActive) {
        await sponsorRef.update({
          bond_direct_starter_level_1: firestore.FieldValue.increment(amount),
        });
        await this.addProfitDetail(
          sponsorRef.id,
          'bond_direct_starter_level_1',
          amount,
          user.id,
        );
      } else {
        await this.addLostProfit(
          sponsorRef.id,
          'bond_direct_starter_level_1',
          amount,
          user.id,
        );
      }
    }
  }

  async addProfitDetail(
    id_user: string,
    type: Types,
    amount: number,
    registerUserId: string,
  ) {
    const userRef = await admin.collection('users').doc(registerUserId).get();
    const user_name = userRef.get('name');
    await admin
      .collection('users')
      .doc(id_user)
      .collection('profits_details')
      .add({
        description: messages[type],
        id_user: registerUserId,
        user_name,
        amount,
        created_at: new Date(),
        type,
      });
  }

  async addLostProfit(
    id_user: string,
    type: Types,
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
    await admin.collection('users').doc(id_user).update({
      bond_direct: 0,
      bond_direct_second_level: 0,
      bond_residual_level_1: 0,
      bond_residual_level_2: 0,
      bond_supreme_level_1: 0,
      bond_supreme_level_2: 0,
      bond_supreme_level_3: 0,
      bond_scholarship_level_1: 0,
      bond_scholarship_level_2: 0,
      bond_scholarship_level_3: 0,
      bond_direct_starter_level_1: 0,
    });
  }
}
