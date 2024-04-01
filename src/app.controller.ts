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

  @Get('cryptoapisverifydomain')
  verifyDomain() {
    return 'cryptoapis-cb-b42ec5c8146fa6d965deba29a8143c9dab912d94f74a8e4649777ccf9851cf91';
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
