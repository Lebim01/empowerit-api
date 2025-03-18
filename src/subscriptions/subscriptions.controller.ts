import { Controller, Get, Query, Body, Post, Param } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PayloadAssignBinaryPosition } from './types';
import { db } from 'src/firebase/admin';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  @Get('isActiveUser')
  isActiveUser(@Query('idUser') idUser: string) {
    return this.subscriptionService.isActiveUser(idUser);
  }

  @Post('createPaymentAddressForCredits')
  async createPaymentAddressProForCredits(@Body() body) {
    if (!body.amount) throw new Error('amount required');
    if (!body.userId) throw new Error('userId required');

    try {
      return await this.subscriptionService.createPaymentAddressForCredits(
        body.userId,
        Number(body.amount),
        body.coin,
      );
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  @Post('statusToExpired')
  statusToExpired() {
    return this.subscriptionService.statusToExpired();
  }

  @Post('createPaymentAddress/:type')
  async createPaymentAddress(@Body() body, @Param('type') type: Memberships) {
    try {
      if (body.coin == 'MXN') {
        return await this.subscriptionService.createOpenpayLink(
          body.userId,
          type,
          body.coin,
        );
      } else if (body.coin == 'USDT') {
      }
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
    return this.subscriptionService.assignBinaryPosition(body, true);
  }

  @Post('assignSanguine')
  async assignSanguine(
    @Body()
    body: PayloadAssignBinaryPosition,
  ) {
    return await this.subscriptionService.insertSanguineUsers(body.id_user);
  }

  @Post('activeWithoutVolumen')
  async activeWithoutVolumen(@Body() body) {
    if (!body.user_id) throw new Error('user_id required');
    if (!body.membership) throw new Error('membership required');

    await db
      .collection('admin-actionvations-without-volume')
      .add({ ...body, created_at: new Date() });

    await this.subscriptionService.onPaymentMembership(
      body.user_id,
      body.membership,
      false,
    );
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

  @Post('addCredits/:id')
  addCredits(@Body() body, @Param('id') id: string) {
    return this.subscriptionService.addCreditsManual(id, body.credits);
  }
}
