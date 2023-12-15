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
  payroll(@Query('blockchain') blockchain: 'bitcoin' | 'litecoin') {
    return this.adminService.payroll(blockchain);
  }

  @Post('/payroll/:payrollid')
  payrollFromPayroll(
    @Param('payrollid') id: string,
    @Query('blockchain') blockchain: 'litecoin' | 'bitcoin',
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
      body.tag,
    );
  }

  // @Post('/lacktopay/:payroll')
  // lacktopay(@Param('payroll') payrollID: string) {
  //   return this.adminService.fixPayLack(payrollID);
  // }

  // @Post('/transfer')
  // transfer(@Body() body) {
  //   return this.adminService.transfer(body);
  // }

  @Get('/users')
  getUsersJson() {
    return this.adminService.usersJson();
  }
}
