import { Body, Controller, Post } from '@nestjs/common';
import { OpenpayService } from './openpay.service';

@Controller('openpay')
export class OpenpayController {
  constructor(private readonly openpayService: OpenpayService) {}

  @Post('charges')
  charges(@Body() body: ChangeSuccess) {
    return this.openpayService.newChange(body);
  }
}
