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
      ? 'cryptoapis-cb-7c30eb71cc36000f77bb05f3bdcb0a84e8f6331df86f6b149b332f28556cd370'
      : 'cryptoapis-cb-1828d17252c5ee682658f1a69e39d22a97a877479f7fb74898f80e0b8ebe4149';
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
