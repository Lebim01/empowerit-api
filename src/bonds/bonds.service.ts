import { Injectable } from '@nestjs/common';
import { doc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { db } from 'src/firebase';

@Injectable()
export class BondsService {
  async execUserDirectBond(sponsor_id: string) {
    const sponsorRef = doc(db, `users/${sponsor_id}`);
    const sponsor = await getDoc(sponsorRef).then((r) => r.data());

    // primer nivel
    if (sponsor) {
      await updateDoc(sponsorRef, {
        bond_direct: increment(sponsor && sponsor.sponsor_id ? 50 : 60),
      });
    }

    // segundo nivel
    if (sponsor && sponsor.sponsor_id) {
      const sponsor2Ref = doc(db, `users/${sponsor.sponsor_id}`);
      await updateDoc(sponsor2Ref, {
        bond_direct_second_level: increment(10),
      });
    }
  }
}
