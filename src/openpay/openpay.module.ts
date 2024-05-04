import { Module } from '@nestjs/common';
import { OpenpayController } from './openpay.controller';
import { OpenpayService } from './openpay.service';

@Module({
  controllers: [OpenpayController],
  providers: [OpenpayService]
})
export class OpenpayModule {}
