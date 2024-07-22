import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { db as admin, auth } from '../firebase/admin';
import * as Sentry from '@sentry/node';

@Injectable()
export class UsersService {
  async isNewMember(id_user: string) {
    const userRef = await getDoc(doc(db, `users/${id_user}`));
    const isNew = Boolean(userRef.get('is_new')) ?? false;
    return isNew;
  }

  async isActiveUser(id_user: string) {
    const user = await admin.collection('users').doc(id_user).get();
    const is_admin =
      Boolean(user.get('is_admin')) || user.get('type') == 'top-lider';
    if (is_admin) return true;

    const is_new_pack = [
      '100-pack',
      '300-pack',
      '500-pack',
      '1000-pack',
      '2000-pack',
    ].includes(user.get('membership'));

    console.log(user.get('membership'));
    if (is_new_pack) {
      const membership_cap_limit = user.get('membership_cap_limit');
      const membership_cap_current = user.get('membership_cap_current');
      return membership_cap_current < membership_cap_limit;
    } else if (user.get('membership') == null) {
      return false;
    } else {
      const expires_at = user.get('membership_expires_at');
      return dayjs(expires_at.seconds * 1000).isAfter(dayjs());
    }
  }

  async getUserByPaymentAddressForParticipations(
    address: string,
    type: PackParticipations,
  ): Promise<null | FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>> {
    try {
      const snap = await admin
        .collection('users')
        .where(`payment_link_participations.${type}.address`, '==', address)
        .get();

      if (snap.empty) return null;

      return snap.docs[0];
    } catch (err) {
      //Sentry.captureException(err);
      return null;
    }
  }

  async getUserByPaymentAddress(
    address: string,
    type: Memberships | PackCredits,
  ): Promise<null | FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>> {
    try {
      const snap = await admin
        .collection('users')
        .where(`payment_link.${type}.address`, '==', address)
        .get();

      if (snap.empty) return null;

      return snap.docs[0];
    } catch (err) {
      //Sentry.captureException(err);
      return null;
    }
  }
  async getUserByPaymentAddressForCredits(
    address: string,
    type: PackCredits,
  ): Promise<null | FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>> {
    try {
      const snap = await admin
        .collection('users')
        .where(`payment_link_credits.${type}.address`, '==', address)
        .get();

      if (snap.empty) return null;

      return snap.docs[0];
    } catch (err) {
      //Sentry.captureException(err);
      return null;
    }
  }

  async getTopUsersByProfit() {
    const snap = await getDocs(
      query(collection(db, 'users'), orderBy('profits', 'desc'), limit(100)),
    );

    if (snap.empty) return null;

    const top = snap.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        profits: data.profits,
        rank: data.rank,
      };
    });

    return top;
  }

  async getTopUsersByReferrals() {
    const snap = await getDocs(
      query(
        collection(db, 'users'),
        orderBy('count_direct_people', 'desc'),
        limit(100),
      ),
    );

    if (snap.empty) return null;

    const top = snap.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        count_direct_people: data.count_direct_people,
      };
    });

    return top;
  }

  async getTopUsersByEarnings() {
    const data = await getDocs(collection(db, 'users'));
    const filteredData = await Promise.all(
      data.docs.map(async (doc) => {
        const payroll = await getDocs(
          query(collection(db, `users/${doc.id}/payroll`)),
        );

        if (payroll.empty) return undefined;

        const payrollData = payroll.docs.map((doc) => doc.data());

        const D28_DAYS_AGO = dayjs().subtract(28, 'days');
        const montlyPayroll = payrollData.filter((data) => {
          const isCurrent = dayjs(data.created_at.toDate()).isAfter(
            D28_DAYS_AGO,
          );
          if (isCurrent) return data;
        });
        if (montlyPayroll.length != 0) {
          const earnings = montlyPayroll.reduce((acc, curr) => {
            if (curr.total) {
              return acc + curr.total;
            }
            return acc;
          }, 0);
          if (earnings != 0) {
            return {
              id: doc.id,
              name: doc.data().name,
              email: doc.data().email,
              earnings,
            };
          }
        }
      }),
    );

    const validData = filteredData.filter((data) => data !== undefined);
    const validDataSorted = validData.sort((a, b) => b.earnings - a.earnings);

    return validDataSorted;
  }

  async restartCycle(id_user: string) {
    await updateDoc(doc(db, `users/${id_user}`), {
      count_direct_people_this_cycle: 0,
    });
  }

  async getMXStates() {
    type HexColor = `#${string}`;
    type Coordinates = [number, number];
    type MXStateCode = `${string}-MX`;

    type State = {
      coordinates: Coordinates;
      name: string;
      value: number;
      color: HexColor;
    };

    type States = {
      [key: MXStateCode]: State;
    };

    const states: States = {
      'BCS-MX': {
        coordinates: [-111.7, 26],
        name: 'Baja California Sur',
        value: 0,
        color: '#B39EB5',
      },
      'BCN-MX': {
        coordinates: [-115, 30],
        name: 'Baja California',
        value: 0,
        color: '#F5CBA7',
      },
      'SON-MX': {
        coordinates: [-110.5, 29.5],
        name: 'Sonora',
        value: 0,
        color: '#85C1E9',
      },
      'CHH-MX': {
        coordinates: [-106, 28.5],
        name: 'Chihuahua',
        value: 0,
        color: '#9E89C9',
      },
      'COA-MX': {
        coordinates: [-102, 27],
        name: 'Coahuila',
        value: 0,
        color: '#D2B4DE',
      },
      'NLE-MX': {
        coordinates: [-100, 25],
        name: 'Nuevo Leon',
        value: 0,
        color: '#ABEBC6',
      },
      'TAM-MX': {
        coordinates: [-98.5, 23.5],
        name: 'Tamaulipas',
        value: 0,
        color: '#F9E79F',
      },
      'DUR-MX': {
        coordinates: [-105, 25],
        name: 'Durango',
        value: 0,
        color: '#AED6F1',
      },
      'SIN-MX': {
        coordinates: [-107.5, 25],
        name: 'Sinaloa',
        value: 0,
        color: '#FAD7A0',
      },
      'NAY-MX': {
        coordinates: [-105, 22],
        name: 'Nayarit',
        value: 0,
        color: '#FF83CE',
      },
      'AGU-MX': {
        coordinates: [-102.5, 22],
        name: 'Aguascalientes',
        value: 0,
        color: '#FF83CE',
      },
      'JAL-MX': {
        coordinates: [-103.6, 20.2],
        name: 'Jalisco',
        value: 0,
        color: '#FCF280',
      },
      'COL-MX': {
        coordinates: [-104, 19.1],
        name: 'Colima',
        value: 0,
        color: '#D2B4DE',
      },
      'ZAC-MX': {
        coordinates: [-103, 23.5],
        name: 'Zacatecas',
        value: 0,
        color: '#ABEBC6',
      },
      'SLP-MX': {
        coordinates: [-100, 22.5],
        name: 'San Luis Potosi',
        value: 0,
        color: '#9E89C9',
      },
      'GUA-MX': {
        coordinates: [-101, 20.8],
        name: 'Guanajuato',
        value: 0,
        color: '#F9E79F',
      },
      'QUE-MX': {
        coordinates: [-99.8, 21],
        name: 'Queretaro',
        value: 0,
        color: '#85C1E9',
      },
      'HID-MX': {
        coordinates: [-99, 20.5],
        name: 'Hidalgo',
        value: 0,
        color: '#AED6F1',
      },
      'CDMX-MX': {
        coordinates: [-99.1, 19.2],
        name: 'CDMX',
        value: 0,
        color: '#FCF280',
      },
      'MEX-MX': {
        coordinates: [-99.8, 19.2],
        name: 'Mexico',
        value: 0,
        color: '#FF83CE',
      },
      'GRO-MX': {
        coordinates: [-99.8, 17.5],
        name: 'Guerrero',
        value: 0,
        color: '#F9E79F',
      },
      'OAX-MX': {
        coordinates: [-96.5, 17],
        name: 'Oaxaca',
        value: 0,
        color: '#D2B4DE',
      },
      'CHP-MX': {
        coordinates: [-93, 16.5],
        name: 'Chiapas',
        value: 0,
        color: '#ABEBC6',
      },
      'TAB-MX': {
        coordinates: [-92.7, 18],
        name: 'Tabasco',
        value: 0,
        color: '#FAD7A0',
      },
      'CAM-MX': {
        coordinates: [-90, 19],
        name: 'Campeche',
        value: 0,
        color: '#85C1E9',
      },
      'ROO-MX': {
        coordinates: [-88.5, 19.5],
        name: 'Quintana Roo',
        value: 0,
        color: '#9E89C9',
      },
      'YUC-MX': {
        coordinates: [-89, 20.5],
        name: 'Yucatan',
        value: 0,
        color: '#F9E79F',
      },
      'MIC-MX': {
        coordinates: [-102, 19.2],
        name: 'Michoacan',
        value: 0,
        color: '#D2B4DE',
      },
      'TLA-MX': {
        coordinates: [-98, 19.4],
        name: 'Tlaxcala',
        value: 0,
        color: '#AED6F1',
      },
      'MOR-MX': {
        coordinates: [-99, 18.7],
        name: 'Morelos',
        value: 0,
        color: '#FF83CE',
      },
      'PUE-MX': {
        coordinates: [-97.7, 18.7],
        name: 'Puebla',
        value: 0,
        color: '#FCF280',
      },
      'VER-MX': {
        coordinates: [-96, 18.7],
        name: 'Veracruz',
        value: 0,
        color: '#85C1E9',
      },
    };

    return states;
  }

  async getMXUsers() {
    const states = this.getMXStates();
    const snap = await getDocs(
      query(collection(db, 'users'), where('country.value', '==', 'MX')),
    );
    if (snap.empty) return states;
    snap.docs.map((doc) => {
      const user = doc.data();
      if (states[user.state.value]) {
        states[user.state.value].value++;
      }
    });

    return states;
  }

  async getMXUsersSanguine(user_id) {
    const states = this.getMXStates();

    const sanguineUsersRef = await collection(
      db,
      `users/${user_id}/sanguine_users`,
    );
    const snap = await getDocs(sanguineUsersRef);
    if (snap.empty) return states;

    const sanguineUsers = snap.docs.map((doc) => doc.data().id_user);
    await Promise.all(
      sanguineUsers.map(async (id) => {
        const userRef = await getDoc(doc(db, `users/${id}`));
        const userData = userRef.data();
        if (states[userData?.state?.value]) {
          states[userData.state.value].value++;
        }
      }),
    );

    return states;
  }

  async getOrganization(user_id: string): Promise<string> {
    const csv = [
      'ID,Nombre,Email,Lado,Fecha Inicio Membresia PRO,Estatus Membresia PRO',
    ];

    const user = await getDoc(doc(db, `users/${user_id}`));

    // left
    const leftQueue = [user.get('left_binary_user_id')].filter(Boolean);
    while (leftQueue.length > 0) {
      const currentLeftUser = leftQueue[0];
      const leftUser = await getDoc(doc(db, `users/${currentLeftUser}`));

      csv.push(
        [
          leftUser.id,
          leftUser.get('name'),
          leftUser.get('email'),
          'Izquierda',
          dayjs(leftUser.get('subscription.pro.start_at').toDate()).format(
            'DD/MM/YYYY',
          ),
          leftUser.get('subscription.pro.status'),
        ].join(','),
      );

      if (leftUser.get('left_binary_user_id')) {
        leftQueue.push(leftUser.get('left_binary_user_id'));
      }
      if (leftUser.get('right_binary_user_id')) {
        leftQueue.push(leftUser.get('right_binary_user_id'));
      }
      leftQueue.splice(0, 1);
    }

    // right
    const rightQueue = [user.get('right_binary_user_id')].filter(Boolean);
    while (rightQueue.length > 0) {
      const currentRightUser = rightQueue[0];
      const rightUser = await getDoc(doc(db, `users/${currentRightUser}`));

      csv.push(
        [
          rightUser.id,
          rightUser.get('name'),
          rightUser.get('email'),
          'Derecha',
          dayjs(rightUser.get('subscription.pro.start_at').toDate()).format(
            'DD/MM/YYYY',
          ),
          rightUser.get('subscription.pro.status'),
        ].join(','),
      );

      if (rightUser.get('left_binary_user_id')) {
        rightQueue.push(rightUser.get('left_binary_user_id'));
      }
      if (rightUser.get('right_binary_user_id')) {
        rightQueue.push(rightUser.get('right_binary_user_id'));
      }
      rightQueue.splice(0, 1);
    }

    return csv.join('\n');
  }

  async changeEmail(from: string, to: string) {
    const user = await auth.getUserByEmail(from);
    const response = await auth.updateUser(user.uid, {
      email: to,
    });
    await admin.collection('users').doc(user.uid).update({
      email: to,
    });
    return response;
  }
}
