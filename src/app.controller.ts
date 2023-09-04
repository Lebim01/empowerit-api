/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('')
  hello() {
    return 'Hello world';
  }

  @Get('cryptoapisverifydomain')
  verifyDomain() {
    return process.env.CUSTOM_ENV == 'production'
      ? 'cryptoapis-cb-3c5ed9409121d6814c3c7383372faefb3ed72ccc4775a42c56c49e92949fc616'
      : 'cryptoapis-cb-c104a80e5982695efb1b26ed8f30e0dc764ec4878f2b58d8f4c4609e8a4c665c';
  }

  @Get('test')
  testSentry() {
    throw new Error('ERROR');
  }

  @Post('sendEmail')
  async sendEmail(@Body('email') email: string, @Body('otp') otp: number) {
    const resultEmail = await this.appService.sendEmail(email, otp);
    return {
      email: resultEmail,
      status: 'Correcto',
    };
  }
}
