import { Injectable } from '@nestjs/common';
import { doc, getDoc } from 'firebase/firestore';
import { db } from 'src/firebase';

@Injectable()
export class ScholarshipService {
  async hasScholarship(idUser: string): Promise<boolean> {
    const user = await getDoc(doc(db, 'users/' + idUser));
    const hasScholarship = Boolean(user.get('has_scholarship'));
    return hasScholarship ? true : false;
  }
}
