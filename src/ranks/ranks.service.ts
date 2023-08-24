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
import { db } from 'src/firebase';
import dayjs from 'dayjs';

@Injectable()
export class RanksService {
  async updateRank() {
    /* Obtener todos los usuraios */
    const users = await getDocs(collection(db, 'users'));

    /* recorrer todos los usuarios */
    for (let i = 0; i <= users.size - 1; i++) {
      const dataUser = await this.getRankUser(users.docs[i].id);
      console.log(dataUser.user);
      const docRef = doc(db, 'users', dataUser.user);
      await updateDoc(docRef, { rank: dataUser.rank });

      await this.insertRank(
        dataUser.rank,
        dataUser.totalUSD.totalUSD,
        dataUser.user,
        dataUser.left_week,
        dataUser.right_week,
        dataUser.sanguinea,
        dataUser.derrame,
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
      const collectionRef = collection(db, 'users');
      const queryCondition = where('sponsor_id', '==', _user.id);
      const queryCondition_ = where(
        'subscription_start_at',
        '>=',
        dayjs().add(-days_start, 'days').toDate(),
      );
      const queryCondition__ = where(
        'subscription_start_at',
        '>=',
        dayjs().add(-days_end, 'days').toDate(),
      );
      console.log(days_end, days_start);
      const filteredQuery = query(
        collectionRef,
        queryCondition,
        queryCondition_,
        queryCondition__,
      );

      /* Obtener el total de usuarios que pertenecen al usuario en turno del */
      const usersSponsored = await getDocs(filteredQuery);
      /* Recorrer los usuarios sponsoreados por el usuario en turno */
      for (const doc of usersSponsored.docs) {
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
    /* Obtener el payroll de los ultimos 28 dias */
    const totalUSD = await this.getPayrollUser(_user.id);
    /* Crear subcoleccion para el historial de rangos */
    const rank = await this.getRank(
      totalUSD.totalUSD,
      _user.data(),
      sanguinea,
      derrame,
    );

    console.log(left_week, right_week);

    return {
      rank: rank.rank,
      rank_missing: rank,
      totalUSD,
      user_id: _user.id,
      user: _user.id,
      left_week,
      right_week,
      sanguinea,
      derrame,
    };
  }

  async getPayrollUser(id) {
    const subCollectionRefpayroll = collection(db, 'users', id, 'payroll');
    const total_week = [];
    let totalUSD = 0;

    for (let i = 0; i <= 3; i++) {
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
        '>=',
        dayjs().add(-days_end, 'days').toDate(),
      );

      const filteredQueryPayroll = query(
        subCollectionRefpayroll,
        queryConditionPayroll,
        queryConditionPayroll_,
      );

      // Obtén los documentos de la subcolección
      try {
        const querySnapshot = await getDocs(filteredQueryPayroll);
        for (const doc of querySnapshot.docs) {
          totalUSD += doc.data().total;
        }
        total_week.push(totalUSD);
      } catch (error) {
        console.error('Error al obtener documentos:', error);
      }
    }
    return { totalUSD, total_week };
  }

  async getRank(totalUSD: number, _users: any, sanguinea: any, derrame: any) {
    console.log('olkdhdjkllkdkd', totalUSD);
    let rank = '';
    let missing_sanguinea = 0;
    let missing_derrame = 0;
    let next_rank = '';
    let missing_usd = 0;
    let missing_scolarship = false;

    if (totalUSD >= 50000 && sanguinea >= 80 && derrame >= 120) {
      rank = 'top_legend';
    } else if (totalUSD >= 20000 && sanguinea >= 40 && derrame >= 60) {
      rank = 'top_1';
      missing_sanguinea = 80 - sanguinea;
      missing_derrame = 120 - derrame;
      missing_usd = 50000 - totalUSD;
      next_rank = 'top_leyend';
    } else if (totalUSD >= 10000 && sanguinea >= 20 && derrame >= 30) {
      rank = 'top_king_10';
      missing_sanguinea = 40 - sanguinea;
      missing_derrame = 60 - derrame;
      missing_usd = 20000 - totalUSD;
      next_rank = 'top_1';
    } else if (totalUSD >= 5000 && sanguinea >= 8 && derrame >= 12) {
      rank = 'top_diamond_5';
      missing_sanguinea = 20 - sanguinea;
      missing_derrame = 30 - derrame;
      missing_usd = 10000 - totalUSD;
      next_rank = 'top_king_10';
    } else if (totalUSD >= 2500 && sanguinea >= 4 && derrame >= 6) {
      rank = 'top_royal_25';
      missing_sanguinea = 8 - sanguinea;
      missing_derrame = 12 - derrame;
      missing_usd = 5000 - totalUSD;
      next_rank = 'top_diamond_5';
    } else if (totalUSD >= 1500 && sanguinea >= 3 && derrame >= 5) {
      rank = 'master_15';
      missing_sanguinea = 4 - sanguinea;
      missing_derrame = 6 - derrame;
      missing_usd = 2500 - totalUSD;
      next_rank = 'top_royal_25';
    } else if (totalUSD >= 1000 && sanguinea >= 2 && derrame >= 3) {
      rank = 'master_1';
      missing_sanguinea = 3 - sanguinea;
      missing_derrame = 5 - derrame;
      missing_usd = 1500 - totalUSD;
      next_rank = 'master_15';
    } else if (totalUSD >= 600) {
      rank = 'runner_6';
      missing_sanguinea = 2 - sanguinea;
      missing_derrame = 3 - derrame;
      missing_usd = 10000 - totalUSD;
      next_rank = 'master_1';
    } else if (totalUSD >= 300) {
      rank = 'runner_3';
      missing_usd = 600 - totalUSD;
      next_rank = 'runner_6';
    } else if (totalUSD >= 100) {
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
      missing_derrame,
      missing_sanguinea,
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
}
