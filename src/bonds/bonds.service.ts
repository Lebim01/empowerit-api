import { Injectable } from '@nestjs/common';
import { doc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { db } from 'src/firebase';
import { UsersService } from 'src/users/users.service';

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
}
