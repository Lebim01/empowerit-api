import { Controller, Get, Query } from '@nestjs/common';
import { CryptoapisService } from './cryptoapis.service';

@Controller('cryptoapis')
export class CryptoapisController {
  constructor(private readonly cryptoapisService: CryptoapisService) {}

  @Get('subscriptionList')
  getSubscriptionList(@Query('offset') offset = 0) {
    return this.cryptoapisService.getSubscriptionList(offset);
  }

  @Get('validateWallet')
  validateWallet(@Query('wallet') wallet: string) {
    return this.cryptoapisService.validateWallet(wallet);
  }
}
