import { Injectable } from '@nestjs/common';
import { db as admin } from '../firebase/admin';
import { BinaryService } from 'src/binary/binary.service';
import { PARTICIPATIONS_BINARY_POINTS, PARTICIPATIONS_PRICES } from 'src/subscriptions/subscriptions.service';
import { BondsService } from 'src/bonds/bonds.service';

const PARTICIPATIONS_CAP_LIMITS = {
  '3000-participation': 6000,
};
const MEMBERSHIP_CAP_LIMIT = {
  '3000-participation': 15000,
};
@Injectable()
export class ParticipationsService {
  constructor(
    private readonly binaryService: BinaryService,
    private readonly bondService: BondsService,
  ) {}
  async activateWithoutVolumen(body) {
    const { form, user_id } = body;

    const userRef = admin.collection('users').doc(user_id);
    const user = await admin.collection('users').doc(user_id).get();

    const startDate = new Date(form.starts_at);

    let next_pay = new Date(startDate);
    next_pay.setMonth(next_pay.getMonth() + 3);
    next_pay.setDate(1);

    const userName = user.get('name');

    await userRef.collection('participations').add({
      next_pay,
      created_at: new Date(),
      participation_cap_current: form.participation_cap_current,
      participation_cap_limit:
        PARTICIPATIONS_CAP_LIMITS[form.participation_name],
      email: form.email,
      userName,
      starts_at: startDate,
      participation_name: form.participation_name,
    });

    await admin.collection('admin-participations-activations').add({
      next_pay,
      created_at: new Date(),
      participation_cap_current: form.participation_cap_current,
      participation_cap_limit:
        PARTICIPATIONS_CAP_LIMITS[form.participation_name],
      email: form.email,
      userName,
      starts_at: startDate,
      participation_name: form.participation_name,
      user_id
    });

    userRef.update({
      has_participations: true,
      membership_cap_limit: MEMBERSHIP_CAP_LIMIT[form.participation_name],
    });
  }
  async activateWithVolumen(body) {
    const { form, user_id } = body;
    const userRef = admin.collection('users').doc(user_id);
    const user = await admin.collection('users').doc(user_id).get();

    const startDate = new Date(form.starts_at);

    let next_pay = new Date(startDate);
    next_pay.setMonth(next_pay.getMonth() + 3);
    next_pay.setDate(1);

    const userName = user.get('name');

    //A;adirlo a la coleccion de activaciones con volumen
    await admin
      .collection('admin-participations-activations-with-volumen')
      .add({
        next_pay,
        participation_cap_current: form.participation_cap_current,
        participation_cap_limit:
          PARTICIPATIONS_CAP_LIMITS[form.participation_name],
        email: form.email,
        userName,
        starts_at: startDate,
        participation_name: form.participation_name,
        user_id,
        created_at: new Date(),
      });

    //A;adirlo a la subcoleccion de participations del usuario
    await userRef.collection('participations').add({
      next_pay,
      created_at: new Date(),
      participation_cap_current: form.participation_cap_current,
      participation_cap_limit:
        PARTICIPATIONS_CAP_LIMITS[form.participation_name],
      email: form.email,
      userName,
      starts_at: startDate,
      participation_name: form.participation_name,
    });

    //Repartir binario y puntos de rango
    try {
      await this.binaryService.increaseBinaryPointsForParticipations(
        user_id,
        PARTICIPATIONS_BINARY_POINTS[form.participation_name],
        form.participation_name,
      );
    } catch (error) {
      console.log(
        'Error al repartir los puntos de binario activando con volumen una participacion',
        error,
      );
    }

    //Repartir bono de inicio rapido
    try {
      await this.bondService.execUserDirectBond(user_id, PARTICIPATIONS_PRICES[form.participation_name], true);
    } catch (error) {
      console.log(
        'Error repartiendo bono de inicio rapido cuando se activa con volumen',
        error,
      );
    }

    console.log(body);
  }
}
