import { Controller, Get, Query, Body, Post, Param } from '@nestjs/common';
import { MEMBERSHIP_CAP, SubscriptionsService } from './subscriptions.service';
import { PayloadAssignBinaryPosition } from './types';
import { auth, db } from 'src/firebase/admin';
import { firestore } from 'firebase-admin';
import dayjs from 'dayjs';

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  @Get('isActiveUser')
  isActiveUser(@Query('idUser') idUser: string) {
    return this.subscriptionService.isActiveUser(idUser);
  }

  @Post('statusToExpired')
  statusToExpired() {
    return this.subscriptionService.statusToExpired();
  }

  @Post('createPaymentAddress/:type')
  async createPaymentAddressPro(
    @Body() body,
    @Param('type') type: Memberships,
  ) {
    try {
      return await this.subscriptionService.createPaymentAddress(
        body.userId,
        type,
        body.coin,
        body.period,
      );
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  @Post('assignBinaryPosition')
  async assignBinaryPosition(
    @Body()
    body: PayloadAssignBinaryPosition,
  ) {
    return this.subscriptionService.assignBinaryPosition(body);
  }

  @Post('activeWithoutVolumen')
  async activeWithoutVolumen(@Body() body) {
    if (!body.sponsor_id) throw new Error('sponsor_id required');
    if (!body.email) throw new Error('email required');
    if (!body.side) throw new Error('side: left or right required');
    if (!body.membership) throw new Error('membership required');

    if (!MEMBERSHIP_CAP[body.membership])
      throw new Error('el type esta mal: ' + body.membership);

    await db
      .collection('users')
      .doc(body.sponsor_id)
      .update({
        count_direct_people: firestore.FieldValue.increment(1),
      });

    const user = await auth.createUser({
      email: body.email,
      password: body.password || '123987xd',
    });

    await db.collection('admin-activations').add({
      id_user: user.uid,
      created_at: new Date(),
      membership: body.membership,
    });

    await db
      .collection('users')
      .doc(user.uid)
      .set({
        email: body.email,
        name: body.name || '',
        sponsor: body.sponsor || '',
        sponsor_id: body.sponsor_id,
        position: body.side,
      });

    await sleep(5000);

    await this.subscriptionService.assingMembershipWithoutCredits(user.uid, body.membership);

    await this.subscriptionService.insertSanguineUsers(user.uid);

    await this.subscriptionService.assignBinaryPosition(
      {
        id_user: user.uid,
        position: body.side,
        sponsor_id: body.sponsor_id,
      },
      false,
    );

    return {
      status: 200,
    };
  }

  @Post('activeWithVolumen')
  async activeWithVolumen(@Body() body) {
    if (!body.user_id) throw new Error('user_id required');
    if (!body.membership) throw new Error('membership required');

    await db
      .collection('admin-actionvations-with-volume')
      .add({ ...body, created_at: new Date() });

    await this.subscriptionService.onPaymentMembership(
      body.user_id,
      body.membership,
    );
  }

  @Post('sendPack')
  sendPack(@Body() body) {
    return this.subscriptionService.createShopifyPack(body.user_id, body.pack);
  }
}
