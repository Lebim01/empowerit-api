import { Injectable } from '@nestjs/common';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from 'src/firebase';

@Injectable()
export class ScholarshipService {
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
}
