import { db } from '../firebase/admin';
import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';

@Injectable()
export class ReportService {
  /**
   * month: 1-12
   */
  async getTopProfitsMonth(month: number) {
    const help = dayjs().set('month', month);
    const date = dayjs(`2023-08-01 00:00:01`);
    const payrolls = await db
      .collectionGroup('payroll')
      .where('created_at', '>=', date.toDate())
      .where('created_at', '<=', date.endOf('month').toDate())
      .get();

    console.log(payrolls.size);

    const people = {};

    for (const doc of payrolls.docs) {
      if (doc.ref.path.includes('users')) {
        const userId = doc.ref.parent.parent.id;
        if (!people[userId]) {
          const userDoc = await db.collection('users').doc(userId).get();
          people[userId] = {
            total: 0,
            name: userDoc.get('name') || '',
          };
        }
        people[userId].total += Number(doc.get('total')) || 0;
      }
    }

    return people;
  }
}
