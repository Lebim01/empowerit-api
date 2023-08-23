import {
  Controller,
  Get,
  Patch,
  Query,
  Body,
  BadRequestException,
  Req,
} from '@nestjs/common';
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
}
