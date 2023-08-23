import { Module } from '@nestjs/common';
import { BondsService } from './bonds.service';
import { UsersService } from 'src/users/users.service';

@Module({
  providers: [BondsService, UsersService],
})
export class BondsModule {}
