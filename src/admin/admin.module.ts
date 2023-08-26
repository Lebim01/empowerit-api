import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CryptoapisService } from '@/cryptoapis/cryptoapis.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, CryptoapisService],
})
export class AdminModule {}
