import { Injectable } from '@nestjs/common';
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { db as admin } from '../firebase/admin';
import dayjs from 'dayjs';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { BinaryService } from 'src/binary/binary.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ScholarshipService {
  constructor(
    private readonly bondService: BondsService,
    private readonly binaryService: BinaryService,
    private readonly userService: UsersService,
  ) {}

  async isActiveUser(id_user: string) {
    const user = await getDoc(doc(db, 'users/' + id_user));
    const expires_at = user.get('subscription.pro.expires_at');

    const is_admin =
      Boolean(user.get('is_admin')) || user.get('type') == 'top-lider';
    return is_admin
      ? true
      : expires_at
      ? dayjs(expires_at.seconds * 1000).isAfter(dayjs())
      : false;
  }

  async hasScholarship(idUser: string): Promise<boolean> {
    const user = await getDoc(doc(db, 'users/' + idUser));
    const hasScholarship = Boolean(user.get('has_scholarship'));
    return hasScholarship ? true : false;
  }

  async assingScholarship(idUser: string) {
    const docRef = doc(db, 'users', idUser);
    const user = await getDoc(docRef);
    const directPeopleCount = user.get('count_scholarship_people');

    if (directPeopleCount >= 2) {
      if (user.get('has_scholarship')) {
        return 'El usuario ya tiene beca';
      }

      const update: any = {
        has_scholarship: true,
      };

      if (user.get('rank') == 'vanguard') {
        update.rank = 'scholarship';
      }

      await updateDoc(docRef, update);
    }
  }

  async addDirectPeople(sponsorId: string, registerUserId: string) {
    const docRef = doc(db, 'users', sponsorId);
    const user = await getDoc(docRef);

    if (!user.exists()) {
      return false;
    }

    if (user.get('has_scholarship')) {
      return false;
    }

    let directPeopleCount = Number(user.get('count_scholarship_people'));
    if (!directPeopleCount) {
      directPeopleCount = 0;
    }
    directPeopleCount += 1;
    await updateDoc(docRef, { count_scholarship_people: directPeopleCount });

    await addDoc(collection(db, `users/${sponsorId}/profits_details`), {
      amount: 0,
      created_at: new Date(),
      description: 'Cuenta para Beca',
      id_user: registerUserId,
      type: 'bond_scholarship_level_1',
      user_name: user.get('name') || '',
    });

    if (directPeopleCount >= 2) {
      await this.assingScholarship(sponsorId);
      await this.distributeBond(sponsorId, registerUserId);
      return true;
    }

    return false;
  }

  async useAllScholarship() {
    const q = query(
      collection(db, 'users'),
      where('subscription.pro.expires_at', '<=', new Date()),
      where('has_scholarship', '==', true),
      orderBy('subscription.pro.expires_at', 'asc'),
    );
    const users = await getDocs(q);

    for (const u of users.docs) {
      await this.useSchorlarship(u.id);
    }

    return users.docs.map((d) => d.id);
  }

  /**
   * Activar la beca, se agregan 28 dias
   * y se reinicia el status de la beca a "false"
   */
  async useSchorlarship(idUser: string) {
    const docRef = doc(db, 'users', idUser);
    const user = await getDoc(docRef);

    if (!user.exists()) {
      return 'El usuario no existe';
    }

    if (!user.get('has_scholarship')) {
      return 'El usuario no tiene beca';
    }

    if (user.get('is_admin') === true || user.get('type') == 'top-lider') {
      return 'El usuario Es admin';
    }

    const initialDate = dayjs().toDate();
    const finalDate = dayjs()
      .add(user.data().is_new ? 56 : 28, 'days')
      .toDate();
    const scholarship = {
      has_scholarship: false,
      count_scholarship_people: 0,
      'subscription.pro.start_at': initialDate,
      'subscription.pro.expires_at': finalDate,
      'subscription.pro.status': 'paid',
      is_new: false,
    };
    await updateDoc(docRef, scholarship);
    await admin.collection('users').doc(idUser).collection('pro-cycles').add({
      start_at: initialDate,
      expires_at: finalDate,
    });

    const sponsor = await admin
      .collection('users')
      .doc(user.get('sponsor_id'))
      .get();

    if (sponsor.get('has_scholarship')) {
      await this.bondService.execUserResidualBond(user.get('sponsor_id'));
      await this.binaryService.increaseBinaryPoints(idUser);
    } else {
      await this.addDirectPeople(user.get('sponsor_id'), idUser);
    }

    await this.userService.restartCycle(user.id);
    await addDoc(collection(db, 'scholarship_activations'), {
      id_user: user.id,
      start_at: initialDate,
      expires_at: finalDate,
      created_at: new Date(),
    });
    return 'Se utilizo la beca';
  }

  async giveBond(userId: string, bondValue: number, registerUserId: string) {
    const BOND_FIELD = {
      50: 'bond_scholarship_level_1',
      20: 'bond_scholarship_level_2',
      10: 'bond_scholarship_level_3',
    };

    const docRef = doc(db, 'users', userId);
    const docData = await getDoc(docRef);

    if (!docData.exists()) return undefined;

    const isActive = await this.isActiveUser(userId);
    if (isActive) {
      let bond = Number(docData.get(BOND_FIELD[bondValue]));
      if (!bond) {
        bond = 0;
      }
      bond += bondValue;

      console.log(BOND_FIELD[bondValue], bond, 'ID:', userId);
      await updateDoc(docRef, {
        [BOND_FIELD[bondValue]]: bond,
      });

      const level = bondValue == 50 ? 1 : bondValue == 20 ? 2 : 3;
      await this.bondService.addProfitDetail(
        userId,
        `bond_scholarship_level_${level}` as any,
        bondValue,
        registerUserId,
      );
    }

    return docData.get('sponsor_id');
  }

  async distributeBond(sponsorId: string, registerUserId: string) {
    const BOND_VALUE_1 = 50; // Usuario
    const BOND_VALUE_2 = 20; // Sponsor (Upline)
    const BOND_VALUE_3 = 10; // Sponsor del sponsor (Upline)

    const nextSponsorId = await this.giveBond(
      sponsorId,
      BOND_VALUE_1,
      registerUserId,
    );

    if (nextSponsorId) {
      const grandSponsorId = await this.giveBond(
        nextSponsorId,
        BOND_VALUE_2,
        registerUserId,
      );
      if (grandSponsorId) {
        await this.giveBond(grandSponsorId, BOND_VALUE_3, registerUserId);
      }
    }
  }

  async direct(id_user: string) {
    await this.bondService.execUserDirectBond(id_user);
  }

  async revisar(id_user: string) {
    const users = await admin
      .collection('users')
      .where('sponsor_id', '==', id_user)
      .where('subscription.pro.start_at', '>=', dayjs('2023-09-08').toDate())
      .orderBy('subscription.pro.start_at', 'desc')
      .get();

    for (const u of users.docs) {
      console.log(u.id, {
        email: u.get('email'),
        name: u.get('name'),
        sponsor_id: u.get('sponsor_id'),
        sponsor: u.get('sponsor'),
        pro_start_at: dayjs(
          u.get('subscription.pro.start_at').seconds * 1000,
        ).format('YYYY-MM-DD HH:mm'),
      });
    }
  }

  async residual(id_user: string) {
    await this.bondService.execUserResidualBond(id_user);
  }

  async copyuser(old_user_id: string, new_user_id: string, body: any) {
    const user = await admin.collection('users').doc(old_user_id).get();
    const sponsor = await admin.collection('users').doc(body.sponsor).get();

    const userDocRef = admin.collection('users').doc(new_user_id);
    const userDoc = await userDocRef.get();

    if(userDoc.exists) {
      await admin
      .collection('users')
      .doc(new_user_id)
      .update({
        email: body.email,
        sponsor_id: body.sponsor,
        sponsor: sponsor.get('name'),
        avatar: user.get('avatar') || '',
        discord: user.get('discord') || '',
      })
    }else{
      await admin
      .collection('users')
      .doc(new_user_id)
      .set({
        email: body.email,
        sponsor_id: body.sponsor,
        position: body.position,
        sponsor: sponsor.get('name'),
        avatar: user.get('avatar') || '',
        discord: user.get('discord') || '',

        created_at: new Date(),
        updated_at: new Date(),
        left: uuidv4(),
        right: uuidv4(),
        profits: 0,
        is_new: true, // flag nuevo usuario (cambia a false cuando se activa su paquete)
        has_scholarship: false,
        is_pending_complete_personal_info: true,
        rank: 'vanguard',

        subscription: {
          pro: {
            expires_at: null,
            start_at: null,
            status: null,
          },
          supreme: {
            expires_at: null,
            start_at: null,
            status: null,
          },
          ibo: {
            expires_at: null,
            start_at: null,
            status: null,
          },
        },

        // CONTADORES
        count_direct_people: 0,
        count_underline_people: 0,
        count_scholarship_people: 0,
        count_direct_people_this_cycle: 0,

        // BINARIOS
        left_points: 0,
        right_points: 0,
        left_binary_user_id: null,
        right_binary_user_id: null,
        parent_binary_user_id: null,

        // BONOS
        bond_direct: 0,
        bond_direct_second_level: 0,
        bond_residual_level_1: 0,
        bond_residual_level_2: 0,
        bond_supreme_level_1: 0,
        bond_supreme_level_2: 0,
        bond_supreme_level_3: 0,
        bond_scholarship_level_1: 0,
        bond_scholarship_level_2: 0,
        bond_scholarship_level_3: 0,
        bond_direct_starter_level_1: 0,
      });
      await this.wait(5000);
    }

    

    

    

    const finishPro = dayjs().add(28, 'days').toDate();
    const finishSupreme = dayjs().add(168, 'days').toDate();
    const finishIBO = dayjs().add(122, 'days').toDate();
    await admin.collection('users').doc(new_user_id).update({
      is_new: false,
      'subscription.pro.payment_link': null,
      'subscription.pro.start_at': new Date(),
      'subscription.pro.expires_at': finishPro,
      'subscription.pro.status': 'paid',
      /*'subscription.supreme.payment_link': null,
      'subscription.supreme.start_at': new Date(),
      'subscription.supreme.expires_at': finishSupreme,
      'subscription.supreme.status': 'paid',*/
      'subscription.ibo.payment_link': null,
      'subscription.ibo.start_at': new Date(),
      'subscription.ibo.expires_at': finishIBO,
      'subscription.ibo.status': 'paid',
    });

    await admin
      .collection('users')
      .doc(new_user_id)
      .collection('pro-cycles')
      .add({
        expires_at: finishPro,
        start_at: new Date(),
      });
    /*await admin
      .collection('users')
      .doc(new_user_id)
      .collection('supreme-cycles')
      .add({
        expires_at: finishSupreme,
        start_at: new Date(),
      });*/
    await admin
      .collection('users')
      .doc(new_user_id)
      .collection('ibo-cycles')
      .add({
        expires_at: finishIBO,
        start_at: new Date(),
      });

    const binaryPosition = await this.binaryService.calculatePositionOfBinary(
      body.sponsor,
      body.position,
    );

    /**
     * se setea el valor del usuario padre en el usuario que se registro
     */
    await userDocRef.update({
      parent_binary_user_id: binaryPosition.parent_id,
    });

    /**
     * se setea el valor del hijo al usuario ascendente en el binario
     */
    await admin
      .collection('users')
      .doc(binaryPosition.parent_id)
      .update(
        body.position == 'left'
          ? { left_binary_user_id: userDocRef.id }
          : { right_binary_user_id: userDocRef.id },
      );

    try {
      await this.binaryService.increaseUnderlinePeople(userDocRef.id);
    } catch (err) {
      console.error(err);
    }

    await this.insertSanguineUsers(userDocRef.id);
  }

  async wait(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async insertSanguineUsers(id_user: string) {
    const userRef = await admin.collection('users').doc(id_user).get();

    const current_user = {
      id: id_user,
      is_active: true,
      created_at: userRef.get('created_at'),
      sponsor_id: userRef.get('sponsor_id'),
      position: userRef.get('position'),
    };

    await admin
      .collection('users')
      .doc(current_user.sponsor_id)
      .collection('sanguine_users')
      .doc(id_user)
      .set(
        {
          id_user: userRef.id,
          sponsor_id: current_user.sponsor_id,
          is_active: current_user.is_active,
          created_at: current_user.created_at || null,
          position: current_user.position || null,
        },
        {
          merge: true,
        },
      );

    const sanguine_sponsors = await getDocs(
      query(
        collectionGroup(db, 'sanguine_users'),
        where('id_user', '==', current_user.sponsor_id),
      ),
    );

    for (const sponsorSanguineRef of sanguine_sponsors.docs) {
      const userId = sponsorSanguineRef.ref.parent.parent.id;
      await setDoc(
        doc(db, `users/${userId}/sanguine_users/${id_user}`),
        {
          id_user: userRef.id,
          sponsor_id: current_user.sponsor_id,
          is_active: current_user.is_active,
          created_at: new Date() || null,
          position: sponsorSanguineRef.get('position') || null,
        },
        {
          merge: true,
        },
      );
    }
  }

  async position(new_user_id, body) {
    const userDocRef = admin.collection('users').doc(new_user_id);

    const binaryPosition = await this.binaryService.calculatePositionOfBinary(
      body.sponsor,
      body.position,
    );

    /**
     * se setea el valor del usuario padre en el usuario que se registro
     */
    await userDocRef.update({
      parent_binary_user_id: binaryPosition.parent_id,
    });

    /**
     * se setea el valor del hijo al usuario ascendente en el binario
     */
    await admin
      .collection('users')
      .doc(binaryPosition.parent_id)
      .update(
        body.position == 'left'
          ? { left_binary_user_id: userDocRef.id }
          : { right_binary_user_id: userDocRef.id },
      );
  }
}
