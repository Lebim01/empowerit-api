import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/payroll')
  getpayroll(@Query('blockchain') blockchain: 'bitcoin' | 'litecoin') {
    return this.adminService.getPayroll(blockchain);
  }

  @Post('/payroll')
  payroll(@Query('blockchain') blockchain: Blockchains) {
    return this.adminService.payroll(blockchain);
  }

  @Post('/payroll/:payrollid')
  payrollFromPayroll(
    @Param('payrollid') id: string,
    @Query('blockchain') blockchain: Blockchains,
  ) {
    return this.adminService.payrollFromPayroll(id, blockchain);
  }

  @Get('/payroll/:payrollid/amount')
  payrollAmount(@Param('payrollid') id: string) {
    return this.adminService.fixPayrollAmount(id);
  }

  @Post('/withdraw')
  withdraw(@Body() body) {
    return this.adminService.withdraw(
      body.address,
      body.amount,
      body.blockchain,
    );
  }

  @Get('/users')
  getUsersJson() {
    return this.adminService.usersJson();
  }

  @Post('pay-participations')
  async payParticipations(@Body() body) {
    if (!body.amount) throw new Error('amount is required');
    return this.adminService.execParticipationsBonus(body.amount);
  }
}
