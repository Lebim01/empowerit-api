import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

  @Get('getOrganization/:user_id')
  getOrganization(@Param('user_id') user_id: string) {
    return this.usersService.getOrganization(user_id);
  }

  @Post('changeEmail')
  changeEmail(@Body() payload) {
    return this.usersService.changeEmail(payload.from, payload.to);
  }

  @Get('fix')
  fix() {
    return this.usersService.fix();
  }
}
