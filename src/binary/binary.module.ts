import { Module } from '@nestjs/common';
import { BinaryService } from './binary.service';
import { UsersService } from 'src/users/users.service';

@Module({
  providers: [BinaryService, UsersService],
})
export class BinaryModule {}
