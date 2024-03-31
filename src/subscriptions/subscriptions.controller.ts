import {
  Controller,
  Get,
  Query,
  Body,
  Post,
  Param,
  HttpException,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PayloadAssignBinaryPosition } from './types';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  @Get('isActiveUser')
  isActiveUser(@Query('idUser') idUser: string) {
    return this.subscriptionService.isActiveUser(idUser);
  }

  @Post('statusToExpired/:type')
  statusToExpired(@Param('type') type) {
    return this.subscriptionService.statusToExpired();
  }

  @Post('createPaymentAddress/pro')
  async createPaymentAddressPro(@Body() body) {
    return this.subscriptionService.createPaymentAddress(
      body.userId,
      'pro',
      body.coin,
      body.period,
    );
  }

  @Post('createPaymentAddress/supreme')
  async createPaymentAddressSupreme(@Body() body) {
    return this.subscriptionService.createPaymentAddress(
      body.userId,
      'supreme',
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
