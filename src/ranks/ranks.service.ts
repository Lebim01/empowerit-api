import { Injectable } from '@nestjs/common';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { db as admin } from '../firebase/admin';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { ranks_object } from './ranks_object';
import { GoogletaskService } from '../googletask/googletask.service';
import { google } from '@google-cloud/tasks/build/protos/protos';

dayjs.extend(weekOfYear);

@Injectable()
export class RanksService {
  constructor(private readonly googleTaskService: GoogletaskService) {}

  async updateRank() {
    /* Obtener todos los usuraios */
    const users = await getDocs(collection(db, 'users'));

    await Promise.all(
      users.docs.map(async (user) => {
        type Method = 'POST';
        const task: google.cloud.tasks.v2.ITask = {
          httpRequest: {
            httpMethod: 'POST' as Method,
            url: `https://${process.env.VERCEL_URL}/ranks/updateUserRank/${user.id}`,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        };

        await this.googleTaskService.addToQueue(
          task,
          this.googleTaskService.getPathQueue('user-rank'),
        );
      }),
    );

    console.log(users.size, 'usuarios');

    return 'OK';
  }

  async updateUserRank(id_user: string) {
    const userRef = doc(db, `users/${id_user}`);
    const user = await getDoc(userRef);
    const rankData = await this.getRankUser(id_user, false);
    const weeks = await this.getWeeks(false);

    const past_max_rank = ranks_object[user.get('max_rank')] || {
      order: -1,
    };
    const current_max_rank = ranks_object[rankData.rank_key];
    const is_new_max_rank = past_max_rank.order < current_max_rank.order;

    await updateDoc(userRef, {
      rank: rankData.rank_key,
      max_rank: is_new_max_rank ? rankData.rank_key : past_max_rank,
    });

    const today = dayjs().utcOffset(-6);
    await admin
      .collection('ranks')
      .doc(`${today.year()}-${today.week()}`)
      .set({
        week_1: [weeks[3][0].toDate(), weeks[3][1].toDate()],
        week_2: [weeks[2][0].toDate(), weeks[2][1].toDate()],
        week_3: [weeks[1][0].toDate(), weeks[1][1].toDate()],
        week_4: [weeks[0][0].toDate(), weeks[0][1].toDate()],
      });
    await admin
      .collection('ranks')
      .doc(`${today.year()}-${today.week()}`)
      .collection('users')
      .doc(id_user)
      .set({
        past_max_rank: past_max_rank,
        current_rank: current_max_rank,
        new_max_rank: is_new_max_rank ? past_max_rank : current_max_rank,
        new_rank: is_new_max_rank,
      });

    if (is_new_max_rank) {
      await admin
        .collection('users')
        .doc(id_user)
        .collection('rank-promotion')
        .add({
          created_at: new Date(),
          rank: rankData.rank_key || 'vanguard',
        });
      await admin.collection('rank-promotion').add({
        id_user,
        name: user.get('name') || '',
        created_at: new Date(),
        rank: rankData.rank_key || 'vanguard',
      });
    }

    await this.insertRank(
      rankData.rank_key,
      rankData.totalUSD.totalUSD,
      rankData.user,
      rankData.left_week,
      rankData.right_week,
      rankData.sanguinea,
      rankData.derrame,
    );
  }

  async getRankUser(userId: string, is_report = false) {
    /* Declarar la coleccion y las condiciones para obtener los usuarios que fueron sponsoreados por el usaurio en turno */
    const user = await getDoc(doc(db, 'users', userId));
    const left_week = [];
    const right_week = [];
    const dates = await this.getWeeks(is_report);

    for (const [start, end] of dates) {
      let left = 0;
      let right = 0;
      const filteredQuery = query(
        collection(db, `users/${user.id}/sanguine_users`),
        where('created_at', '>=', start.toDate()),
        where('created_at', '<=', end.toDate()),
        where(
          'created_at',
          '>=',
          dayjs('2023-09-01 00:00:01').utcOffset(-6).toDate(),
        ),
      );

      /* Obtener el total de usuarios que pertenecen al usuario en turno del */
      const sanguineUsers = await getDocs(filteredQuery);
      /* Recorrer los usuarios sponsoreados por el usuario en turno */
      for (const doc of sanguineUsers.docs) {
        /* Acumular el contador depentiendo del valor del atributo position del usuario esponsoreado */
        if (doc.get('position') === 'left') {
          left++;
        } else {
          right++;
        }
      }
      left_week.push(left);
      right_week.push(right);
    }

    const sanguinea = user.get('position') == 'left' ? right_week : left_week;
    const derrame = user.get('position') == 'left' ? left_week : right_week;
    const firms = await this.getDirectFirms(user.id, is_report);
    /* Obtener el payroll de los ultimos 28 dias */
    const totalUSD = await this.getPayrollUser(user.id, is_report);
    /* Crear subcoleccion para el historial de rangos */
    const rank = await this.getRank(
      totalUSD.totalUSD,
      user.data(),
      sanguinea,
      derrame,
      firms,
    );

    return {
      rank_key: rank.rank,
      rank_next_key: rank.next_rank,
      rank: ranks_object[rank.rank],
      rank_missing: ranks_object[rank.rank],
      next_rank: ranks_object[rank.next_rank],
      totalUSD,
      user_id: user.id,
      user: user.id,
      left_week,
      right_week,
      sanguinea,
      derrame,
      firms,
    };
  }

  async getDirectFirms(id, is_report = false) {
    /* Obtener firmas  directas*/
    const firm_week = [];
    const dates = await this.getWeeks(is_report);

    for (const [start, end] of dates) {
      let firm = 0;
      const filteredQuery = query(
        collection(db, `users`),
        where('created_at', '>=', start.toDate()),
        where('created_at', '<=', end.toDate()),
        where('sponsor_id', '==', id),
        where('created_at', '>=', dayjs('2023-09-01 06:00:01').toDate()),
      );

      /* Obtener el total de usuarios que pertenecen al usuario en turno del */
      const firmsUsers = await getDocs(filteredQuery);
      /* Recorrer los usuarios sponsoreados por el usuario en turno */
      for (const doc of firmsUsers.docs) {
        /* Acumular el contador depentiendo del valor del atributo position del usuario esponsoreado */
        if (doc) firm++;
      }
      firm_week.push(firm);
    }
    return firm_week;
  }

  async getPayrollUser(id, is_report = false) {
    const subCollectionRefpayroll = collection(db, 'users', id, 'payroll');
    const total_week = [];
    let totalUSD = 0;
    const dates = await this.getWeeks(is_report);

    for (const [start, end] of dates) {
      let totalUSD_week = 0;

      const filteredQueryPayroll = query(
        subCollectionRefpayroll,
        where('created_at', '>=', start.toDate()),
        where('created_at', '<=', end.toDate()),
        where('created_at', '>=', dayjs('2023-09-01 00:00:01').toDate()),
      );

      // Obtén los documentos de la subcolección
      try {
        const querySnapshot = await getDocs(filteredQueryPayroll);
        for (const doc of querySnapshot.docs) {
          totalUSD += doc.data().total || 0;
          totalUSD_week += doc.data().total || 0;
        }
        total_week.push(totalUSD_week);
      } catch (error) {
        console.error('Error al obtener documentos:', error);
      }
    }
    return { totalUSD, total_week };
  }

  async getRank(
    totalUSD: number,
    user: any,
    interna: number[],
    externa: number[],
    firms: number[],
  ) {
    let rank = '';
    let next_rank = '';
    let missing_usd = 0;
    let missing_scolarship = false;

    const total_firms_last_4_weeks = firms.reduce((a, b) => a + b, 0);
    const has_firms_internal = (min_firms: number) =>
      interna.every((firm) => firm >= min_firms);
    const has_firms_external = (min_firms: number) =>
      externa.every((firm) => firm >= min_firms);

    if (
      totalUSD >= 50_000 &&
      user.has_scholarship &&
      total_firms_last_4_weeks >= 10 &&
      has_firms_external(80) &&
      has_firms_internal(120)
    ) {
      rank = 'top_legend';
    } else if (
      totalUSD >= 20_000 &&
      user.has_scholarship &&
      total_firms_last_4_weeks >= 9 &&
      has_firms_external(40) &&
      has_firms_internal(60)
    ) {
      rank = 'top_1';
      missing_usd = 50000 - totalUSD;
      next_rank = 'top_leyend';
    } else if (
      totalUSD >= 10_000 &&
      user.has_scholarship &&
      total_firms_last_4_weeks >= 8 &&
      has_firms_external(20) &&
      has_firms_internal(30)
    ) {
      rank = 'top_king_10';
      missing_usd = 20000 - totalUSD;
      next_rank = 'top_1';
    } else if (
      totalUSD >= 5_000 &&
      user.has_scholarship &&
      total_firms_last_4_weeks >= 7 &&
      has_firms_external(8) &&
      has_firms_internal(12)
    ) {
      rank = 'top_diamond_5';
      missing_usd = 10000 - totalUSD;
      next_rank = 'top_king_10';
    } else if (
      totalUSD >= 2_500 &&
      user.has_scholarship &&
      total_firms_last_4_weeks >= 6 &&
      has_firms_external(4) &&
      has_firms_internal(6)
    ) {
      rank = 'top_royal_25';
      missing_usd = 5000 - totalUSD;
      next_rank = 'top_diamond_5';
    } else if (
      totalUSD >= 1_500 &&
      user.has_scholarship &&
      total_firms_last_4_weeks >= 5 &&
      has_firms_external(3) &&
      has_firms_internal(5)
    ) {
      rank = 'master_15';
      missing_usd = 2500 - totalUSD;
      next_rank = 'top_royal_25';
    } else if (
      totalUSD >= 1_000 &&
      user.has_scholarship &&
      total_firms_last_4_weeks >= 4 &&
      has_firms_external(2) &&
      has_firms_internal(3)
    ) {
      rank = 'master_1';
      missing_usd = 1500 - totalUSD;
      next_rank = 'master_15';
    } else if (
      totalUSD >= 600 &&
      user.has_scholarship &&
      total_firms_last_4_weeks >= 3 &&
      has_firms_external(2) &&
      has_firms_internal(1)
    ) {
      rank = 'runner_6';
      missing_usd = 10000 - totalUSD;
      next_rank = 'master_1';
    } else if (
      totalUSD >= 300 &&
      user.has_scholarship &&
      total_firms_last_4_weeks >= 2 &&
      has_firms_internal(1) &&
      has_firms_external(1)
    ) {
      rank = 'runner_3';
      missing_usd = 600 - totalUSD;
      next_rank = 'runner_6';
    } else if (
      totalUSD >= 100 &&
      user.has_scholarship &&
      total_firms_last_4_weeks >= 1
    ) {
      rank = 'runner_1';
      missing_usd = 300 - totalUSD;
      next_rank = 'runner_3';
    } else if (user.has_scholarship) {
      rank = 'scholarship';
      missing_usd = 100 - totalUSD;
      next_rank = 'runner_1';
    } else {
      rank = 'vanguard';
      next_rank = 'scholarship';
      missing_scolarship = true;
    }

    return {
      rank,
      missing_usd,
      next_rank,
      missing_scolarship,
    };
  }

  async insertRank(
    rank: string,
    totalUSD: number,
    _users: any,
    left: any,
    right: any,
    sanguinea: any,
    derrame: any,
  ) {
    const mainCollectionRef = collection(db, 'users');
    const mainDocRef = doc(mainCollectionRef, _users);
    const subCollectionRef = collection(mainDocRef, 'rank_history');
    try {
      await addDoc(subCollectionRef, {
        rank,
        date: dayjs().toDate(),
        total: totalUSD,
        left,
        right,
        sanguinea,
        derrame,
      });
    } catch (error) {
      console.error('Error al agregar documento:', error);
    }
  }

  async getRankKey(key: string) {
    return ranks_object[key];
  }

  async getWeeks(is_report = false) {
    const day_of_week = dayjs().day();
    const sunday_this_week = dayjs()
      .utcOffset(-6)
      .subtract(day_of_week == 0 || day_of_week == 1 ? 1 : 0, 'day')
      .startOf('week')
      .hour(23)
      .minute(59);
    const sunday_2_weeks = sunday_this_week.subtract(1, 'week');
    const sunday_3_weeks = sunday_this_week.subtract(2, 'week');
    const sunday_4_weeks = sunday_this_week.subtract(3, 'week');
    const sunday_5_weeks = sunday_this_week.subtract(4, 'week');
    const sunday_6_weeks = sunday_this_week.subtract(5, 'week');

    const dates = [
      [sunday_4_weeks, sunday_4_weeks.add(7, 'days')],
      [sunday_3_weeks, sunday_3_weeks.add(7, 'days')],
      [sunday_2_weeks, sunday_2_weeks.add(7, 'days')],
      [sunday_this_week, sunday_this_week.add(7, 'days')],
    ];

    if (is_report) {
      dates.unshift([sunday_5_weeks, sunday_5_weeks.add(7, 'days')]);
      dates.unshift([sunday_6_weeks, sunday_6_weeks.add(7, 'days')]);
    }

    console.log(
      dates.map(([start, end]) => ({
        start: start.format('YYYY-MM-DD HH:mm:ss'),
        end: end.format('YYYY-MM-DD HH:mm:ss'),
      })),
    );

    return dates;
  }

  async newRanks(
    year: string,
    week: string,
    returnType: 'csv' | 'json' = 'json',
  ) {
    const prevWeek = (Number(week) - 1).toString();

    const usersPrev = await admin
      .collection('ranks')
      .doc(`${year}-${prevWeek}`)
      .collection('users')
      .get();

    const usersNew = await admin
      .collection('ranks')
      .doc(`${year}-${week}`)
      .collection('users')
      .get();

    const response = [];

    for (const newRank of usersNew.docs) {
      if (
        !['vanguard', 'scholarship'].includes(newRank.get('new_max_rank.key'))
      ) {
        const pastRank = usersPrev.docs.find((r) => r.id == newRank.id);

        if (
          pastRank.get('new_max_rank.key') != newRank.get('new_max_rank.key')
        ) {
          const user = await admin.collection('users').doc(newRank.id).get();
          const sponsor = await admin
            .collection('users')
            .doc(user.get('sponsor_id'))
            .get();
          response.push({
            past_rank: pastRank.get('new_max_rank.display'),
            new_rank: newRank.get('new_max_rank.display'),
            name: user.get('name'),
            email: user.get('email'),
            id: user.id,
            sponsor: sponsor.get('name'),
            sponsor_email: sponsor.get('email'),
          });
        }
      }
    }

    return returnType == 'json'
      ? response
      : [
          'ID,NOMBRE,EMAIL,PATROCINADOR,PATROCINADOR EMAIL,RANGO PASADO,NUEVO RANGO',
          ...response.map((r) =>
            [
              r.id,
              r.name,
              r.email,
              r.sponsor,
              r.sponsor_email,
              r.past_rank,
              r.new_rank,
            ].join(','),
          ),
        ].join('\n');
  }
}
