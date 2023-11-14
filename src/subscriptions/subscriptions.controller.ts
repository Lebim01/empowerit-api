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
    if (type == 'pro') {
      return this.subscriptionService.statusToExpiredPro();
    }
    return this.subscriptionService.statusToExpired(type);
  }

  @Post('createPaymentAddress/pro')
  async createPaymentAddressPro(@Body() body) {
    return this.subscriptionService.createPaymentAddress(
      body.userId,
      'pro',
      body.coin,
    );
  }

  @Post('createPaymentAddress/supreme')
  async createPaymentAddressSupreme(@Body() body) {
    return this.subscriptionService.createPaymentAddress(
      body.userId,
      'supreme',
      body.coin,
    );
  }

  @Post('createPaymentAddress/ibo')
  async createPaymentAddressIbo(@Body() body) {
    return this.subscriptionService.createPaymentAddress(
      body.userId,
      'ibo',
      body.coin,
    );
  }

  @Post('createPaymentAddress/starter')
  async createPaymentAddressStarter(@Body() body) {
    return this.subscriptionService.createPaymentAddress(
      body.userId,
      'starter',
      body.coin,
    );
  }

  @Post('createPaymentAddressPack')
  async createPaymentAddressPack(@Body() body) {
    if (body.type == 'pro+supreme') {
      return this.subscriptionService.createPaymentAddressPack(
        body.userId,
        body.type,
        body.coin,
      );
    }
    return new HttpException('Tipo invalido', 404);
  }

  @Post('starterActivatePro')
  async starterActivatePro(@Body() body) {
    return this.subscriptionService.starterActivatePro(body.user_id);
  }

  @Post('assignBinaryPosition')
  async assignBinaryPosition(
    @Body()
    body: PayloadAssignBinaryPosition,
  ) {
    return this.subscriptionService.assignBinaryPosition(body);
  }
}
