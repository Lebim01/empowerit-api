import { Injectable } from '@nestjs/common';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

@Injectable()
export class ScholarshipService {
  async isActiveUser(id_user: string) {
    const user = await getDoc(doc(db, 'users/' + id_user));
    const expires_at = user.get('subscription.pro.expires_at');

    const is_admin = Boolean(user.get('is_admin'));
    return is_admin
      ? true
      : expires_at
      ? dayjs(expires_at.seconds * 1000).isAfter(dayjs())
      : false;
  }

  async hasScholarship(idUser: string): Promise<boolean> {
    const user = await getDoc(doc(db, 'users/' + idUser));
    const hasScholarship = Boolean(user.get('has_scholarship'));
    return hasScholarship ? true : false;
  }

  async assingScholarship(idUser: string) {
    const docRef = doc(db, 'users', idUser);
    const user = await getDoc(docRef);
    const directPeopleCount = user.get('count_scholarship_people');

    if (directPeopleCount >= 2) {
      if (user.get('has_scholarship')) {
        return 'El usuario ya tiene beca';
      }
      await updateDoc(docRef, {
        has_scholarship: true,
      });
    }
  }

  async addDirectPeople(idUser: string) {
    const docRef = doc(db, 'users', idUser);
    const user = await getDoc(docRef);

    if (!user.exists()) {
      return false;
    }

    if (user.get('has_scholarship')) {
      return false;
    }

    let directPeopleCount = Number(user.get('count_scholarship_people'));
    if (!directPeopleCount) {
      directPeopleCount = 0;
    }
    directPeopleCount += 1;
    await updateDoc(docRef, { count_scholarship_people: directPeopleCount });

    if (directPeopleCount >= 2) {
      await this.assingScholarship(idUser);
      await this.distributeBond(idUser);
      return true;
    }

    return false;
  }

  async useAllScholarship() {
    const q = query(
      collection(db, 'users'),
      where('subscription.pro.expires_at', '<=', new Date()),
      where('has_scholarship', '==', true),
      orderBy('subscription.pro.expires_at', 'asc'),
    );
    const users = await getDocs(q);

    for (const u of users.docs) {
      await this.useSchorlarship(u.id);
    }

    return users.docs.map((d) => d.id);
  }

  /**
   * Activar la beca, se agregan 28 dias
   * y se reinicia el status de la beca a "false"
   */
  async useSchorlarship(idUser: string) {
    const docRef = doc(db, 'users', idUser);
    const user = await getDoc(docRef);

    if (!user.exists()) {
      return 'El usuario no existe';
    }

    if (!user.get('has_scholarship')) {
      return 'El usuario no tiene beca';
    }

    const initialDate = dayjs().toDate();
    const finalDate = dayjs()
      .add(user.data().is_new ? 56 : 28, 'days')
      .toDate();
    const scholarship = {
      has_scholarship: false,
      count_scholarship_people: 0,
      'subscription.pro.start_at': initialDate,
      'subscription.pro.expires_at': finalDate,
      is_new: false,
    };
    await updateDoc(docRef, scholarship);
    return 'Se utilizo la beca';
  }

  async giveBond(userId: string, bondValue: number) {
    const BOND_FIELD = {
      50: 'bond_scholarship_level_1',
      20: 'bond_scholarship_level_2',
      10: 'bond_scholarship_level_3',
    };

    const docRef = doc(db, 'users', userId);
    const docData = await getDoc(docRef);

    if (!docData.exists()) return undefined;

    const isActive = await this.isActiveUser(userId);
    if (isActive) {
      let bond = Number(docData.get(BOND_FIELD[bondValue]));
      if (!bond) {
        bond = 0;
      }
      bond += bondValue;

      console.log(BOND_FIELD[bondValue], bond, 'ID:', userId);
      await updateDoc(docRef, {
        [BOND_FIELD[bondValue]]: bond,
      });
    }

    return docData.get('sponsor_id');
  }

  async distributeBond(idUser: string) {
    const BOND_VALUE_1 = 50; // Usuario
    const BOND_VALUE_2 = 20; // Sponsor (Upline)
    const BOND_VALUE_3 = 10; // Sponsor del sponsor (Upline)

    const sponsorId = await this.giveBond(idUser, BOND_VALUE_1);

    if (sponsorId) {
      const grandSponsorId = await this.giveBond(sponsorId, BOND_VALUE_2);
      if (grandSponsorId) {
        await this.giveBond(grandSponsorId, BOND_VALUE_3);
      }
    }
  }
}
