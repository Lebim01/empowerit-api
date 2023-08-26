import { Controller, Get, Patch, Query, Body, Post } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  @Get('isActiveUser')
  isActiveUser(@Query('idUser') idUser: string) {
    return this.subscriptionService.isActiveUser(idUser);
  }

  @Patch('statusToExpired')
  statusToExpired(@Body() body: { day: number; month: number; year: number }) {
    return this.subscriptionService.statusToExpired(body);
  }

  @Post('createPaymentAddress/pro')
  async createPaymentAddressPro(@Body() body) {
    return this.subscriptionService.createPaymentAddress(body.userId, 'pro');
  }

  @Post('createPaymentAddress/supreme')
  async createPaymentAddressSupreme(@Body() body) {
    return this.subscriptionService.createPaymentAddress(
      body.userId,
      'supreme',
    );
  }

  @Post('createPaymentAddress/ibo')
  async createPaymentAddressIbo(@Body() body) {
    return this.subscriptionService.createPaymentAddress(body.userId, 'ibo');
  }

  @Post('insertSanguineUsers')
  async insertSanguineUsers(@Body() body) {
    return this.subscriptionService.insertSanguineUsers(body.userId);
  }
}
