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
          bond_residual_level_1: increment(
            sponsor && sponsor.sponsor_id ? 30 : 50,
          ),
        });
      }
    }

    // segundo nivel
    if (sponsor && sponsor.sponsor_id) {
      const isActive = await this.userService.isActiveUser(sponsor.sponsor_id);
      if (isActive) {
        const sponsor2Ref = doc(db, `users/${sponsor.sponsor_id}`);
        await updateDoc(sponsor2Ref, {
          bond_residual_level_2: increment(20),
        });
      }
    }
  }

  async execSupremeBond(id_user: string) {
    const userRef = await getDoc(doc(db, `users/${id_user}`));
    
    // Comprobar que el usuario tenga sponsor
    const id_sponsor = userRef.get('sponsor_id');
    if(!id_sponsor) {
      console.log('\x1b[33m%s\x1b[0m', `El usuario ${userRef.get('email')} no cuenta con un patrocinador.`);
      return;
    }

    const sponsorRef = await getDoc(
      doc(db, `users/${id_sponsor}`),
    );
    const sequence = Number(sponsorRef.get('supreme_sequence') ?? 0);

    let nextBond = sequence + 1;
    if (nextBond > 3) {
      nextBond = 1;
    }

    switch (nextBond) {
      case 1:
        const is_active = await this.userService.isSupremeActive(
          sponsorRef.ref.id,
        );
        // El usuario debe ser supreme tambien
        if (is_active) {
          await updateDoc(sponsorRef.ref, {
            bond_supreme_level_1: increment(100),
          });
        }
        break;
      case 2:
      case 3:
        try {
          const is_active = await this.userService.isSupremeActive(
            sponsorRef.ref.id,
          );
          // El usuario debe ser supreme tambien
          if (is_active) {
            await updateDoc(sponsorRef.ref, {
              bond_supreme_level_1: increment(50),
            });
          }

          const sponsor2 = await getDoc(
            doc(db, `users/${sponsorRef.get('sponsor_id')}`),
          );
          const is_active_2 = await this.userService.isSupremeActive(
            sponsor2.id,
          );
          // El usuario debe ser supreme tambien
          if (is_active_2) {
            await updateDoc(sponsor2.ref, {
              bond_supreme_level_2: increment(20),
            });
          }

          const sponsor3 = await getDoc(
            doc(db, `users/${sponsor2.get('sponsor_id')}`),
          );
          const is_active_3 = await this.userService.isSupremeActive(
            sponsor3.id,
          );
          // El usuario debe ser supreme tambien
          if (is_active_3) {
            await updateDoc(sponsor3.ref, {
              bond_supreme_level_3: increment(10),
            });
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

    await updateDoc(sponsorRef.ref, {
      supreme_sequence: nextBond,
    });
  }
}
