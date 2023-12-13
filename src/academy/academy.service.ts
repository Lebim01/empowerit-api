import { Injectable } from '@nestjs/common';
import { db } from 'src/firebase/admin';

@Injectable()
export class AcademyService {
  async getCourseById(courseId: string, courseType: string) {
    const snap = await db.collection(courseType).doc(courseId).get();
    return snap.exists ? snap.data() : null;
  }
}
