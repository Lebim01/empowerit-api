import { Body, Controller, Post } from '@nestjs/common';

@Controller('openpay')
export class OpenpayController {
  @Post('charges')
  charges(@Body() body) {
    console.log(body);
    return body;
  }
}
