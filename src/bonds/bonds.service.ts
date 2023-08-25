import { Injectable } from '@nestjs/common';
import { doc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UsersService } from 'src/users/users.service';
import * as Sentry from '@sentry/node';

@Injectable()
export class BondsService {
  constructor(private readonly userService: UsersService) {}

  /**
   * solo se reparte este bono a los usuarios activos
   */
  async execUserDirectBond(sponsor_id: string) {
    const sponsorRef = doc(db, `users/${sponsor_id}`);
    const sponsor = await getDoc(sponsorRef).then((r) => r.data());

    // primer nivel
    if (sponsor) {
      const isActive = await this.userService.isActiveUser(sponsor_id);
      if (isActive) {
        await updateDoc(sponsorRef, {
          bond_direct: increment(sponsor && sponsor.sponsor_id ? 50 : 60),
        });
      }
    }

    // segundo nivel
    if (sponsor && sponsor.sponsor_id) {
      const isActive = await this.userService.isActiveUser(sponsor.sponsor_id);
      if (isActive) {
        const sponsor2Ref = doc(db, `users/${sponsor.sponsor_id}`);
        await updateDoc(sponsor2Ref, {
          bond_direct_second_level: increment(10),
        });
      }
    }
  }

  async execUserResidualBond(sponsor_id: string) {
    const sponsorRef = doc(db, `users/${sponsor_id}`);
    const sponsor = await getDoc(sponsorRef).then((r) => r.data());

    // primer nivel
    if (sponsor) {
      const isActive = await this.userService.isActiveUser(sponsor_id);
      if (isActive) {
        await updateDoc(sponsorRef, {
          bond_residual: increment(sponsor && sponsor.sponsor_id ? 30 : 50),
        });
      }
    }

    // segundo nivel
    if (sponsor && sponsor.sponsor_id) {
      const isActive = await this.userService.isActiveUser(sponsor.sponsor_id);
      if (isActive) {
        const sponsor2Ref = doc(db, `users/${sponsor.sponsor_id}`);
        await updateDoc(sponsor2Ref, {
          bond_residual_second_level: increment(20),
        });
      }
    }
  }

  async execSupremeBond(id_user: string) {
    const userRef = await getDoc(doc(db, `users/${id_user}`));

    const sequence = Number(userRef.get('supreme_sequence') ?? 0);

    let nextBond = sequence + 1;
    if (nextBond == 4) {
      nextBond = 1;
    }

    const sponsorRef = await getDoc(
      doc(db, `users/${userRef.get('sponsor_id')}`),
    );

    switch (nextBond) {
      case 1:
        await updateDoc(sponsorRef.ref, {
          bond_supreme_first_level: increment(100),
        });
        break;
      case 2:
      case 3:
        try {
          await updateDoc(sponsorRef.ref, {
            bond_supreme_first_level: increment(50),
          });

          const sponsor2 = await getDoc(
            doc(db, `users/${sponsorRef.get('sponsor_id')}`),
          );
          await updateDoc(sponsor2.ref, {
            bond_supreme_second_level: increment(20),
          });

          const sponsor3 = await getDoc(
            doc(db, `users/${sponsor2.get('sponsor_id')}`),
          );
          await updateDoc(sponsor3.ref, {
            bond_supreme_third_level: increment(10),
          });
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
  }
}
