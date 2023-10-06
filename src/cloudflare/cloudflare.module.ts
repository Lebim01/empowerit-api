import { Module } from '@nestjs/common';
import { CloudflareController } from './cloudflare.controller';
import { CloudflareService } from './cloudflare.service';
import { AcademyService } from 'src/academy/academy.service';

@Module({
  controllers: [CloudflareController],
  providers: [CloudflareService, AcademyService],
})
export class CloudflareModule {}
