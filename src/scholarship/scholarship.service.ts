import { Injectable } from '@nestjs/common';
import {
  addDoc,
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
import { db as admin } from '../firebase/admin';
import dayjs from 'dayjs';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { BinaryService } from 'src/binary/binary.service';

@Injectable()
export class ScholarshipService {
  constructor(
    private readonly bondService: BondsService,
    private readonly binaryService: BinaryService,
    private readonly userService: UsersService,
  ) {}

  async isActiveUser(id_user: string) {
    const user = await getDoc(doc(db, 'users/' + id_user));
    const expires_at = user.get('subscription.pro.expires_at');

    const is_admin =
      Boolean(user.get('is_admin')) || user.get('type') == 'top-lider';
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

      const update: any = {
        has_scholarship: true,
      };

      if (user.get('rank') == 'vanguard') {
        update.rank = 'scholarship';
      }

      await updateDoc(docRef, update);
    }
  }

  async addDirectPeople(sponsorId: string, registerUserId: string) {
    const docRef = doc(db, 'users', sponsorId);
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
      await addDoc(collection(db, `users/${sponsorId}/profits_details`), {
        amount: 0,
        created_at: new Date(),
        description: 'Cuenta para Beca',
        id_user: registerUserId,
        type: 'bond_scholarship_level_1',
        user_name: user.get('name') || '',
      });
      await this.assingScholarship(sponsorId);
      await this.distributeBond(sponsorId, registerUserId);
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

    if (user.get('is_admin') === true || user.get('type') == 'top-lider') {
      return 'El usuario Es admin';
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
      'subscription.pro.status': 'paid',
      is_new: false,
    };
    await updateDoc(docRef, scholarship);
    await admin.collection('users').doc(idUser).collection('pro-cycles').add({
      start_at: initialDate,
      expires_at: finalDate,
    });

    const sponsor = await admin
      .collection('users')
      .doc(user.get('sponsor_id'))
      .get();

    if (sponsor.get('has_scholarship')) {
      await this.bondService.execUserResidualBond(user.get('sponsor_id'));
      await this.binaryService.increaseBinaryPoints(idUser);
    } else {
      await this.addDirectPeople(user.get('sponsor_id'), idUser);
    }

    await this.userService.restartCycle(user.id);
    await addDoc(collection(db, 'scholarship_activations'), {
      id_user: user.id,
      start_at: initialDate,
      expires_at: finalDate,
      created_at: new Date(),
    });
    return 'Se utilizo la beca';
  }

  async giveBond(userId: string, bondValue: number, registerUserId: string) {
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

      const level = bondValue == 50 ? 1 : bondValue == 20 ? 2 : 3;
      await this.bondService.addProfitDetail(
        userId,
        `bond_direct_level_${level}` as any,
        bondValue,
        registerUserId,
      );
    }

    return docData.get('sponsor_id');
  }

  async distributeBond(sponsorId: string, registerUserId: string) {
    const BOND_VALUE_1 = 50; // Usuario
    const BOND_VALUE_2 = 20; // Sponsor (Upline)
    const BOND_VALUE_3 = 10; // Sponsor del sponsor (Upline)

    const nextSponsorId = await this.giveBond(
      sponsorId,
      BOND_VALUE_1,
      registerUserId,
    );

    if (nextSponsorId) {
      const grandSponsorId = await this.giveBond(
        nextSponsorId,
        BOND_VALUE_2,
        registerUserId,
      );
      if (grandSponsorId) {
        await this.giveBond(grandSponsorId, BOND_VALUE_3, registerUserId);
      }
    }
  }
}
