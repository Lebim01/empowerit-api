import { Module } from '@nestjs/common';
import { ScriptsController } from './scripts.controller';
import { ScriptsService } from './scripts.service';
import { UsersService } from 'src/users/users.service';

@Module({
  controllers: [ScriptsController],
  providers: [ScriptsService, UsersService],
})
export class ScriptsModule {}
