import { Injectable } from '@nestjs/common';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from 'src/firebase';
import * as dayjs from 'dayjs';

@Injectable()
export class ScholarshipService {
  async isActiveUser(id_user: string) {
    const user = await getDoc(doc(db, 'users/' + id_user));
    const expires_at = user.get('subscription_expires_at');
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
      const scholarship = {
        has_scholarship: true,
        count_scholarship_people: 0,
      };
      await updateDoc(docRef, scholarship);
    }
  }

  async addDirectPeople(idUser: string) {
    const docRef = doc(db, 'users', idUser);
    const user = await getDoc(docRef);

    if (!user.exists()) {
      return 'El usuario no existe';
    }

    if (user.get('has_scholarship')) {
      return 'El usuario ya tiene beca';
    }

    let directPeopleCount = Number(user.get('count_scholarship_people'));
    if (!directPeopleCount) {
      directPeopleCount = 0;
    }
    directPeopleCount += 1;
    await updateDoc(docRef, { count_scholarship_people: directPeopleCount });

    if (directPeopleCount >= 2) {
      await this.assingScholarship(idUser);
      return 'Se asigno beca al usuario';
    }

    return 'Persona para beca 1 de 2';
  }

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
    const finalDate = dayjs().add(28, 'days').toDate();
    const scholarship = {
      has_scholarship: false,
      count_scholarship_people: 0,
      subscription_start_at: initialDate,
      subscription_expires_at: finalDate,
    };
    await updateDoc(docRef, scholarship);
    return 'Se utilizo la beca';
  }

  async distributeBond(idUser: string) {
    const BOND_VALUE_1 = 50; // Usuario
    const BOND_VALUE_2 = 20; // Sponsor (Upline)
    const BOND_VALUE_3 = 10; // Sponsor del sponsor (Upline)

    const userRef = doc(db, 'users', idUser);
    const user = await getDoc(userRef);

    if (!user.exists()) {
      return 'El usuario no existe';
    }

    const isActive = await this.isActiveUser(idUser);
    if (!isActive) {
      return 'El usuario no esta activo';
    }

    let bond = Number(user.get('bond_scholarship_level_1'));
    if (!bond) {
      bond = 0;
    }
    bond += BOND_VALUE_1;
    console.log('Usuario: ', bond, 'id', idUser);
    await updateDoc(userRef, {
      bond_scholarship_level_1: bond,
    });

    const sponsorId = user.get('sponsor_id');
    if (sponsorId) {
      const sponsorRef = doc(db, 'users', sponsorId);
      const sponsor = await getDoc(sponsorRef);

      if (sponsor.exists()) {
        const isActive = await this.isActiveUser(sponsorId);
        if (isActive) {
          let bond = Number(sponsor.get('bond_scholarship_level_2'));
          if (!bond) {
            bond = 0;
          }
          bond += BOND_VALUE_2;
          console.log('Sponsor: ', bond, 'id', sponsorId);
          await updateDoc(sponsorRef, {
            bond_scholarship_level_2: bond,
          });
        }
      }

      const grandSponsorId = sponsor.get('sponsor_id');
      if (grandSponsorId) {
        const grandSponsorRef = doc(db, 'users', grandSponsorId);
        const grandSponsor = await getDoc(grandSponsorRef);

        if (grandSponsor.exists()) {
          const isActive = await this.isActiveUser(grandSponsorId);
          if (isActive) {
            let bond = Number(grandSponsor.get('bond_scholarship_level_3'));
            if (!bond) {
              bond = 0;
            }
            bond += BOND_VALUE_3;
            console.log('Sponsor del sponsor: ', bond, 'id', grandSponsorId);
            await updateDoc(grandSponsorRef, {
              bond_scholarship_level_3: bond,
            });
          }
        }
      }
    }
  }
}
