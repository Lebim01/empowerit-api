import { Module } from '@nestjs/common';
import { BinaryService } from './binary.service';
import { UsersService } from 'src/users/users.service';
import { BinaryController } from './binary.controller';

@Module({
  providers: [BinaryService, UsersService],
  controllers: [BinaryController],
})
export class BinaryModule {}
