import { Controller, Get, Query, Body, Post, Param } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PayloadAssignBinaryPosition } from './types';

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
    return this.subscriptionService.createPaymentAddress(
      body.userId,
      type,
      body.coin,
      body.period,
    );
  }

  @Post('assignBinaryPosition')
  async assignBinaryPosition(
    @Body()
    body: PayloadAssignBinaryPosition,
  ) {
    return this.subscriptionService.assignBinaryPosition(body);
  }
}
