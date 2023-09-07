import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('top-profits')
  getTopUsersByProfit() {
    return this.usersService.getTopUsersByProfit();
  }

  @Get('top-direct')
  getTopUsersByReferrals() {
    return this.usersService.getTopUsersByReferrals();
  }

  @Get('top-earnings')
  viewData() {
    return this.usersService.getTopUsersByEarnings();
  }

  @Get('mx-users')
  getMxUsers() {
    return this.usersService.getMXUsers();
  }

  @Get('mx-users-sanguine/:user_id')
  getMxUsersSanguine(@Param('user_id') user_id: string) {
    return this.usersService.getMXUsersSanguine(user_id);
  }
}
