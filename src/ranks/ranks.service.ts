import { Injectable, Query } from '@nestjs/common';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
} from 'firebase/firestore';
import { db } from 'src/firebase';
import * as dayjs from 'dayjs';

@Injectable()
export class RanksService {
  async updateRank() {
    /* Obtener todos los usuraios */
    const users = await getDocs(collection(db, 'users'));

    /* recorrer todos los usuarios */
    for (let i = 0; i <= users.size - 1; i++) {
      const dataUser = await this.getRankUser(users.docs[i].id);
      await this.insertRank(
        dataUser.rank,
        dataUser.toltalUSD,
        dataUser.user,
        dataUser.left,
        dataUser.right,
        dataUser.sanguinea,
        dataUser.derrame,
      );
    }
  }

  async getRankUser(userId: string) {
    /* Declarar la coleccion y las condiciones para obtener los usuarios que fueron sponsoreados por el usaurio en turno */
    const _user = await getDoc(doc(db, 'users', userId));
    const collectionRef = collection(db, 'users');
    const queryCondition = where('sponsor_id', '==', _user.id);
    const queryCondition_ = where(
      'subscription_start_at',
      '>=',
      dayjs().add(-28, 'days').toDate(),
    );
    const filteredQuery = query(collectionRef, queryCondition, queryCondition_);
    let left = 0;
    let right = 0;
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

    const sanguinea = _user.data().position == 'left' ? right : left;
    const derrame = _user.data().position == 'left' ? left : right;
    /* Obtener el payroll de los ultimos 28 dias */
    const toltalUSD = await this.getPayrollUser(_user.id);
    /* Crear subcoleccion para el historial de rangos */
    const rank = await this.getRank(
      toltalUSD,
      _user.data(),
      sanguinea,
      derrame,
    );

    return {
      rank: rank.rank,
      rank_missing: rank,
      toltalUSD,
      user: _user.id,
      left,
      right,
      sanguinea,
      derrame,
    };
  }

  async getPayrollUser(id) {
    const subCollectionRefpayroll = collection(db, 'users', id, 'payroll');

    const queryConditionPayroll = where(
      'created_at',
      '>=',
      dayjs().add(-28, 'days').toDate(),
    );

    const filteredQueryPayroll = query(
      subCollectionRefpayroll,
      queryConditionPayroll,
    );

    // Obtén los documentos de la subcolección
    let toltalUSD = 0;
    try {
      const querySnapshot = await getDocs(filteredQueryPayroll);
      for (const doc of querySnapshot.docs) {
        toltalUSD += doc.data().total;
      }
    } catch (error) {
      console.error('Error al obtener documentos:', error);
    }
    return toltalUSD;
  }

  async getRank(
    toltalUSD: number,
    _users: any,
    sanguinea: number,
    derrame: number,
  ) {
    let rank = '';
    let missing_sanguinea = 0;
    let missing_derrame = 0;
    let next_rank = '';
    let missing_usd = 0;
    let missing_scolarship = false;

    if (toltalUSD >= 50000 && sanguinea >= 80 && derrame >= 120) {
      rank = 'TOP LEYEND';
    } else if (toltalUSD >= 20000 && sanguinea >= 40 && derrame >= 60) {
      rank = 'TOP %1';
      missing_sanguinea = 80 - sanguinea;
      missing_derrame = 120 - derrame;
      missing_usd = 50000 - toltalUSD;
      next_rank = 'TOP LEYEND';
    } else if (toltalUSD >= 10000 && sanguinea >= 20 && derrame >= 30) {
      rank = 'TOP KING 10,000';
      missing_sanguinea = 40 - sanguinea;
      missing_derrame = 60 - derrame;
      missing_usd = 20000 - toltalUSD;
      next_rank = 'TOP %1';
    } else if (toltalUSD >= 5000 && sanguinea >= 8 && derrame >= 12) {
      rank = 'TOP DIAMOND 5000';
      missing_sanguinea = 20 - sanguinea;
      missing_derrame = 30 - derrame;
      missing_usd = 10000 - toltalUSD;
      next_rank = 'TOP KING 10,000';
    } else if (toltalUSD >= 2500 && sanguinea >= 4 && derrame >= 6) {
      rank = 'TOP ROYAL2500';
      missing_sanguinea = 8 - sanguinea;
      missing_derrame = 12 - derrame;
      missing_usd = 5000 - toltalUSD;
      next_rank = 'TOP DIAMOND 5000';
    } else if (toltalUSD >= 1500 && sanguinea >= 3 && derrame >= 5) {
      rank = 'MASTER 1500';
      missing_sanguinea = 4 - sanguinea;
      missing_derrame = 6 - derrame;
      missing_usd = 2500 - toltalUSD;
      next_rank = 'TOP ROYAL2500';
    } else if (toltalUSD >= 1000 && sanguinea >= 2 && derrame >= 3) {
      rank = 'MASTER 1000';
      missing_sanguinea = 3 - sanguinea;
      missing_derrame = 5 - derrame;
      missing_usd = 1500 - toltalUSD;
      next_rank = 'MASTER 1500';
    } else if (toltalUSD >= 600) {
      rank = 'RUNNER 600';
      missing_sanguinea = 2 - sanguinea;
      missing_derrame = 3 - derrame;
      missing_usd = 10000 - toltalUSD;
      next_rank = 'MASTER 1000';
    } else if (toltalUSD >= 300) {
      rank = 'RUNNER 300';
      missing_usd = 600 - toltalUSD;
      next_rank = 'RUNNER 600';
    } else if (toltalUSD >= 100) {
      rank = 'RUNNER 100';
      missing_usd = 300 - toltalUSD;
      next_rank = 'RUNNER 300';
    } else if (_users.has_scholarship) {
      rank = 'SCOLARSHIP';
      missing_usd = 100 - toltalUSD;
      next_rank = 'RUNNER 100';
    } else {
      rank = 'VANGUARD';
      next_rank = 'SCOLARSHIP';
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
    toltalUSD: number,
    _users: any,
    left: number,
    right: number,
    sanguinea: number,
    derrame: number,
  ) {
    const mainCollectionRef = collection(db, 'users');
    const mainDocRef = doc(mainCollectionRef, _users);
    const subCollectionRef = collection(mainDocRef, 'rank_history');
    try {
      await addDoc(subCollectionRef, {
        rank,
        date: dayjs().toDate(),
        total: toltalUSD,
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
