import { Module } from '@nestjs/common';
import { GoogletaskService } from './googletask.service';

@Module({
  providers: [GoogletaskService]
})
export class GoogletaskModule {}
