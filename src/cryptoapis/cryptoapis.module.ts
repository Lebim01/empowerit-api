import { Module } from '@nestjs/common';
import { CryptoapisService } from './cryptoapis.service';
import { CryptoapisController } from './cryptoapis.controller';

@Module({
  providers: [CryptoapisService],
  controllers: [CryptoapisController],
})
export class CryptoapisModule {}
