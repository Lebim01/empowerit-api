import { Controller, Get, Query } from '@nestjs/common';
import { CryptoapisService } from './cryptoapis.service';

@Controller('cryptoapis')
export class CryptoapisController {
  constructor(private readonly cryptoapisService: CryptoapisService) {}

  @Get('removeUnusedSubscriptionList')
  removeUnusedSubscriptionList(@Query('offset') offset = 0) {
    return this.cryptoapisService.removeUnusedSubscriptionList(offset);
  }

  @Get('validateWallet')
  validateWallet(@Query('wallet') wallet: string) {
    return this.cryptoapisService.validateWallet(wallet);
  }
}
