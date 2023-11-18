import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/payroll')
  getpayroll(@Query('blockchain') blockchain: 'bitcoin' | 'xrp') {
    return this.adminService.getPayroll(blockchain);
  }

  @Post('/payroll')
  payroll(@Query('blockchain') blockchain: 'bitcoin' | 'xrp') {
    return this.adminService.payroll(blockchain);
  }

  @Post('/payroll/:payrollid')
  payrollFromPayroll(
    @Param('payrollid') id: string,
    @Query('blockchain') blockchain: 'xrp' | 'bitcoin',
  ) {
    return this.adminService.payrollFromPayroll(id, blockchain);
  }

  @Get('/payroll/:payrollid/amount')
  payrollAmount(@Param('payrollid') id: string) {
    return this.adminService.fixPayrollAmount(id);
  }

  @Post('/withdraw')
  withdraw(@Body() body) {
    return this.adminService.withdraw(body.address, body.amount);
  }

  @Post('/callbackSendedCoins/xrp/:address/:amount')
  confirmPayment(
    @Param('address') address: string,
    @Param('amount') amount: string,
    @Body() body: any,
  ) {
    console.log(body);
    return this.adminService.reduceWalletAmount(address, Number(amount));
  }
}
