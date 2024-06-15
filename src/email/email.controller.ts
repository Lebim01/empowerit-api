import { Controller, Get } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('test')
  test() {
    return this.emailService.sendEmailNewUser('9CXMbcJt2sNWG40zqWwQSxH8iki2');
  }
}
