/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('')
  hello() {
    return 'Hello world';
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
