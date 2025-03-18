import { Module } from '@nestjs/common';
import { BinaryService } from './binary.service';
import { UsersService } from 'src/users/users.service';
import { BinaryController } from './binary.controller';
import { BondsService } from 'src/bonds/bonds.service';

@Module({
  providers: [BinaryService, UsersService, BondsService],
  controllers: [BinaryController],
})
export class BinaryModule {}
