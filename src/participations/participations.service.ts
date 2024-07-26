import { Injectable } from '@nestjs/common';
import { db as admin } from '../firebase/admin';

const PARTICIPATIONS_CAP_LIMITS = {
  '3000-participation': 6000,
};
const MEMBERSHIP_CAP_LIMIT = {
  '3000-participation': 15000,
};
@Injectable()
export class ParticipationsService {
  async activateWithoutVolumen(body) {
    const { form, user_id } = body;

    const userRef = admin.collection('users').doc(user_id);
    const user = await admin.collection('users').doc(user_id).get();

    const startDate = new Date(form.starts_at);

    let next_pay = new Date(startDate);
    next_pay.setMonth(next_pay.getMonth() + 3);
    next_pay.setDate(1);

    console.log(form);

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

    userRef.update({
      has_participations: true,
      membership_cap_limit: MEMBERSHIP_CAP_LIMIT[form.participation_name],
    });
  }
}
