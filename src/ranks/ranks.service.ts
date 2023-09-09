import { Injectable, Query } from '@nestjs/common';
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
import dayjs from 'dayjs';
import { ranks_object } from './ranks_object';

//

@Injectable()
export class RanksService {
  async updateRank() {
    /* Obtener todos los usuraios */
    const users = await getDocs(collection(db, 'users'));

    /* recorrer todos los usuarios */
    for (let i = 0; i <= users.size - 1; i++) {
      const user = users.docs[i];
      const rankData = await this.getRankUser(users.docs[i].id);
      await updateDoc(user.ref, { rank: rankData.rank_key });

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
  }

  async getRankUser(userId: string) {
    /* Declarar la coleccion y las condiciones para obtener los usuarios que fueron sponsoreados por el usaurio en turno */
    const _user = await getDoc(doc(db, 'users', userId));
    const left_week = [];
    const right_week = [];

    for (let i = 0; i <= 3; i++) {
      let left = 0;
      let right = 0;
      const days_start =
        i == 0 ? 28 : i == 1 ? 21 : i == 2 ? 14 : i == 3 ? 7 : 0;
      const days_end = i == 0 ? 21 : i == 1 ? 14 : i == 2 ? 7 : i == 3 ? 0 : 0;
      const collectionRef = collection(db, `users/${_user.id}/sanguine_users`);
      const queryCondition_ = where(
        'created_at',
        '>=',
        dayjs().add(-days_start, 'days').toDate(),
      );
      const queryCondition__ = where(
        'created_at',
        '<=',
        dayjs().add(-days_end, 'days').toDate(),
      );
      const filteredQuery = query(
        collectionRef,
        queryCondition_,
        queryCondition__,
        where('created_at', '>=', dayjs('2023-09-01 06:00:00').toDate()),
      );

      /* Obtener el total de usuarios que pertenecen al usuario en turno del */
      const sanguineUsers = await getDocs(filteredQuery);
      /* Recorrer los usuarios sponsoreados por el usuario en turno */
      for (const doc of sanguineUsers.docs) {
        /* Acumular el contador depentiendo del valor del atributo position del usuario esponsoreado */
        if (doc.data().position === 'left') {
          left++;
        } else if (doc.data().position === 'right') {
          right++;
        }
      }
      left_week.push(left);
      right_week.push(right);
    }

    const sanguinea = _user.data().position == 'left' ? right_week : left_week;
    const derrame = _user.data().position == 'left' ? left_week : right_week;
    const firms = await this.getDirectFirms(_user.id);
    /* Obtener el payroll de los ultimos 28 dias */
    const totalUSD = await this.getPayrollUser(_user.id);
    /* Crear subcoleccion para el historial de rangos */
    const rank = await this.getRank(
      totalUSD.totalUSD,
      _user.data(),
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
      user_id: _user.id,
      user: _user.id,
      left_week,
      right_week,
      sanguinea,
      derrame,
      firms,
    };
  }

  async getDirectFirms(id) {
    /* Obtener firmas  directas*/
    const firm_week = [];
    for (let i = 0; i <= 3; i++) {
      let firm = 0;
      const days_start =
        i == 0 ? 28 : i == 1 ? 21 : i == 2 ? 14 : i == 3 ? 7 : 0;
      const days_end = i == 0 ? 21 : i == 1 ? 14 : i == 2 ? 7 : i == 3 ? 0 : 0;
      const collectionRef = collection(db, `users`);
      const queryCondition_ = where(
        'created_at',
        '>=',
        dayjs().add(-days_start, 'days').toDate(),
      );
      const queryCondition__ = where(
        'created_at',
        '<=',
        dayjs().add(-days_end, 'days').toDate(),
      );
      const queryCondition___ = where('sponsor_id', '==', id);

      const filteredQuery = query(
        collectionRef,
        queryCondition_,
        queryCondition__,
        queryCondition___,
        where('created_at', '>=', dayjs('2023-09-01 06:00:00').toDate()),
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

  async getPayrollUser(id) {
    const subCollectionRefpayroll = collection(db, 'users', id, 'payroll');
    const total_week = [];
    let totalUSD = 0;

    for (let i = 0; i <= 3; i++) {
      let totalUSD_week = 0;

      const days_start =
        i == 0 ? 28 : i == 1 ? 21 : i == 2 ? 14 : i == 3 ? 7 : 0;
      const days_end = i == 0 ? 21 : i == 1 ? 14 : i == 2 ? 7 : i == 3 ? 0 : 0;
      const queryConditionPayroll = where(
        'created_at',
        '>=',
        dayjs().add(-days_start, 'days').toDate(),
      );

      const queryConditionPayroll_ = where(
        'created_at',
        '<=',
        dayjs().add(-days_end, 'days').toDate(),
      );

      const filteredQueryPayroll = query(
        subCollectionRefpayroll,
        queryConditionPayroll,
        queryConditionPayroll_,
        where('created_at', '>=', dayjs('2023-09-01 06:00:00').toDate()),
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
    _users: any,
    sanguinea: number[],
    derrame: number[],
    firms: number[],
  ) {
    let rank = '';
    let next_rank = '';
    let missing_usd = 0;
    let missing_scolarship = false;

    if (
      totalUSD >= 50000 &&
      sanguinea.every((currentValue) => currentValue >= 80) &&
      derrame.every((currentValue) => currentValue >= 120) &&
      _users.has_scholarship &&
      firms.every((currentValue) => currentValue >= 10)
    ) {
      rank = 'top_legend';
    } else if (
      totalUSD >= 20000 &&
      sanguinea.every((currentValue) => currentValue >= 40) &&
      derrame.every((currentValue) => currentValue >= 60) &&
      _users.has_scholarship &&
      firms.every((currentValue) => currentValue >= 9)
    ) {
      rank = 'top_1';
      missing_usd = 50000 - totalUSD;
      next_rank = 'top_leyend';
    } else if (
      totalUSD >= 10000 &&
      sanguinea.every((currentValue) => currentValue >= 20) &&
      derrame.every((currentValue) => currentValue >= 30) &&
      _users.has_scholarship &&
      firms.every((currentValue) => currentValue >= 8)
    ) {
      rank = 'top_king_10';
      missing_usd = 20000 - totalUSD;
      next_rank = 'top_1';
    } else if (
      totalUSD >= 5000 &&
      sanguinea.every((currentValue) => currentValue >= 8) &&
      derrame.every((currentValue) => currentValue >= 12) &&
      _users.has_scholarship &&
      firms.every((currentValue) => currentValue >= 7)
    ) {
      rank = 'top_diamond_5';
      missing_usd = 10000 - totalUSD;
      next_rank = 'top_king_10';
    } else if (
      totalUSD >= 2500 &&
      sanguinea.every((currentValue) => currentValue >= 4) &&
      derrame.every((currentValue) => currentValue >= 6) &&
      _users.has_scholarship &&
      firms.every((currentValue) => currentValue >= 6)
    ) {
      rank = 'top_royal_25';
      missing_usd = 5000 - totalUSD;
      next_rank = 'top_diamond_5';
    } else if (
      totalUSD >= 1500 &&
      sanguinea.every((currentValue) => currentValue >= 3) &&
      derrame.every((currentValue) => currentValue >= 5) &&
      _users.has_scholarship &&
      firms.every((currentValue) => currentValue >= 5)
    ) {
      rank = 'master_15';
      missing_usd = 2500 - totalUSD;
      next_rank = 'top_royal_25';
    } else if (
      totalUSD >= 1000 &&
      sanguinea.every((currentValue) => currentValue >= 2) &&
      derrame.every((currentValue) => currentValue >= 3) &&
      _users.has_scholarship &&
      firms.every((currentValue) => currentValue >= 4)
    ) {
      rank = 'master_1';
      missing_usd = 1500 - totalUSD;
      next_rank = 'master_15';
    } else if (
      totalUSD >= 600 &&
      _users.has_scholarship &&
      firms.every((currentValue) => currentValue >= 3)
    ) {
      rank = 'runner_6';
      missing_usd = 10000 - totalUSD;
      next_rank = 'master_1';
    } else if (
      totalUSD >= 300 &&
      _users.has_scholarship &&
      firms.every((currentValue) => currentValue >= 2)
    ) {
      rank = 'runner_3';
      missing_usd = 600 - totalUSD;
      next_rank = 'runner_6';
    } else if (
      totalUSD >= 100 &&
      _users.has_scholarship &&
      firms.every((currentValue) => currentValue >= 1)
    ) {
      rank = 'runner_1';
      missing_usd = 300 - totalUSD;
      next_rank = 'runner_3';
    } else if (_users.has_scholarship) {
      rank = 'scolarship';
      missing_usd = 100 - totalUSD;
      next_rank = 'runner_1';
    } else {
      rank = 'vanguard';
      next_rank = 'scolarship';
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

  async test() {
    const sunday_this_week = dayjs().startOf('week').hour(23);
    const sunday_2_weeks = sunday_this_week.subtract(1, 'week');
    const sunday_3_weeks = sunday_this_week.subtract(2, 'week');
    const sunday_4_weeks = sunday_this_week.subtract(3, 'week');

    const dates = [
      [sunday_this_week, sunday_this_week.add(7, 'days')],
      [sunday_2_weeks, sunday_2_weeks.add(7, 'days')],
      [sunday_3_weeks, sunday_3_weeks.add(7, 'days')],
      [sunday_4_weeks, sunday_4_weeks.add(7, 'days')],
    ];

    for (const [start, end] of dates) {
      console.log(
        start.format('YYYY-MM-DD HH:mm'),
        '-',
        end.format('YYYY-MM-DD HH:mm'),
      );
    }
  }
}
