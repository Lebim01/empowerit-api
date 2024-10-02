import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import admin from 'firebase-admin';
import { db } from 'src/firebase/admin';

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

  @Get('getCustomToken')
  getCustomToken(@Query('user') user: string) {
    return admin.auth().createCustomToken(user);
  }

  @Post('fixParentBinary')
  async fixParentBinary() {
    const users = await db
      .collection('users')
      .where('parent_binary_user_id', '==', null)
      .get();

    for (const u of users.docs) {
      if (u.id != '9CXMbcJt2sNWG40zqWwQSxH8iki2') {
        const parent_is_left = await db
          .collection('users')
          .where('left_binary_user_id', '==', u.id)
          .get();
        if (!parent_is_left.empty) {
          console.log(u.id);
          await u.ref.update({
            parent_binary_user_id: parent_is_left.docs[0].id,
          });
          continue;
        }

        const parent_is_right = await db
          .collection('users')
          .where('right_binary_user_id', '==', u.id)
          .get();
        if (!parent_is_right.empty) {
          console.log(u.id);
          await u.ref.update({
            parent_binary_user_id: parent_is_right.docs[0].id,
          });
          continue;
        }
      }
    }
  }

  @Post('copy')
  async copy() {
    const user = await db
      .collection('users')
      .doc('uxDEwMSoTOeviAXL6wmpTcE0rkx2')
      .get();
    await db
      .collection('users')
      .doc('BPhiz2FmzMZuiAwMZ2bgCIPTEBf2')
      .set(user.data());
  }

  @Get('verifySanguineUsersParentId')
  async verifySanguineUsersParentId() {
    return this.usersService.verifySanguineUser();
  }

  @Post('restartCreditsSpent')
  async restartCreditsSpent() {
    return this.usersService.restartCreditsSpent();
  }
}
