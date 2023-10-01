import { db } from '../firebase/admin';
import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';

@Injectable()
export class ReportService {
  async restartMonth() {
    const batch = db.batch();
    const users = await db.collection('users').get();

    const date = dayjs().add(-1, 'day');
    const year = date.year();
    const month = date.month();

    for (const u of users.docs) {
      batch.set(db.doc(`users/${u.id}/history_months/${year}-${month}`), {
        count_direct_people_this_month:
          u.get('count_direct_people_this_month') || 0,
        profits_this_month: u.get('profits_this_month') || 0,
        created_at: new Date(),
      });
      batch.update(u.ref, {
        count_direct_people_this_month: 0,
        profits_this_month: 0,
      });
    }

    await batch.commit();
    return 'OK';
  }
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

  async fix() {
    const users = await db
      .collection('users')
      .doc('fkQL4rwDBebtQgSXzZacf75DmCt1')
      .collection('sanguine_users')
      .get();

    const weeks = [
      [
        dayjs('2023-08-27 11:00:00').utcOffset(-6),
        dayjs('2023-09-03 11:00:00').utcOffset(-6),
      ],
      [
        dayjs('2023-09-03 11:00:00').utcOffset(-6),
        dayjs('2023-09-10 11:00:00').utcOffset(-6),
      ],
      [
        dayjs('2023-09-10 11:00:00').utcOffset(-6),
        dayjs('2023-09-17 11:00:00').utcOffset(-6),
      ],
      [
        dayjs('2023-09-17 11:00:00').utcOffset(-6),
        dayjs('2023-09-24 11:00:00').utcOffset(-6),
      ],
    ];

    const users_by_week = [[], [], [], []];

    for (const user of users.docs) {
      const weekIndex = weeks.findIndex(([start, end]) => {
        const created_at = dayjs(user.get('created_at').seconds * 1000);
        return created_at.isAfter(start) && created_at.isBefore(end);
      });

      if (weekIndex > -1)
        users_by_week[weekIndex].push({
          id: user.id,
          name: user.get('name'),
          position: user.get('position'),
          created_at: dayjs(user.get('created_at').seconds * 1000).format(
            'YYYY-MM-DD[T]HH:mm:ss',
          ),
        });
    }

    return users_by_week;
  }
}
