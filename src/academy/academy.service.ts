import { Injectable } from '@nestjs/common';
import { db } from 'src/firebase/admin';

@Injectable()
export class AcademyService {
  async getCourseById(courseId: string) {
    const snap = await db.collection('courses').doc(courseId).get();
    return snap.exists ? snap.data() : null;
  }
}
