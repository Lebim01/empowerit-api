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
      const last_firm = await this.getLastFirmDate(u.id);
      const docData = {
        count_direct_people_this_month:
          u.get('count_direct_people_this_month') || 0,
        profits_this_month: u.get('profits_this_month') || 0,
        id_user: u.id,
        last_firm,
        created_at: new Date(),
      };

      batch.set(
        db.doc(`users/${u.id}/history_months/${year}-${month}`),
        docData,
      );
      batch.update(u.ref, {
        count_direct_people_this_month: 0,
        profits_this_month: 0,
      });

      const newDoc = db
        .collection('report-month')
        .doc(`${year}-${month}`)
        .collection('users')
        .doc();
      batch.set(newDoc, docData);
    }

    await batch.commit();
    return 'OK';
  }
  /**
   * month: 1-12
   */
  async getTopProfitsMonth(month: number) {
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

  async topMes(month: string) {
    const snap = await db
      .collection('report-month')
      .doc(month)
      .collection('users')
      .orderBy('profits_this_month', 'desc')
      .limit(25)
      .get();

    const headers = [
      'ID',
      'Nombre',
      'Email',
      'Firmas',
      'Ultima firma',
      'Ganancias',
    ];
    const rows = [headers.join(',')];

    for (const doc of snap.docs) {
      console.log(doc.id);
      const user = await db.collection('users').doc(doc.get('id_user')).get();
      rows.push(
        [
          user.id,
          user.get('name'),
          user.get('email'),
          doc.get('count_direct_people_this_month'),
          dayjs(doc.get('last_firm')?.seconds * 1000)
            .utcOffset(-6)
            .format('YYYY-MM-DD HH:mm:ss'),
          doc.get('profits_this_month'),
        ].join(','),
      );
    }

    return rows;
  }

  async getLastFirmDate(id_user: string) {
    const last_firm = await db
      .collection('users')
      .where('sponsor_id', '==', id_user)
      .where('subscription.pro.status', '==', 'paid')
      .where('created_at', '>', dayjs('2023-09-01T06:00:00').toDate())
      .where('created_at', '<', dayjs('2023-10-01T06:00:00').toDate())
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();
    return last_firm.empty ? null : last_firm.docs[0].get('created_at');
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
