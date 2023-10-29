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

  @Post('createPaymentAddressPack')
  async createPaymentAddressPack(@Body() body) {
    if (body.type == 'pro+supreme') {
      return this.subscriptionService.createPaymentAddressPack(
        body.userId,
        body.type,
      );
    }
    return new HttpException('Tipo invalido', 404);
  }

  @Post('starterActivatePro')
  async starterActivatePro(@Body() body) {
    return this.subscriptionService.starterActivatePro(body.user_id);
  }
}
