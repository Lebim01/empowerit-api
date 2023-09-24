import { Controller, Get, Param, Post } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/payroll')
  getpayroll() {
    return this.adminService.getPayroll();
  }

  @Post('/payroll')
  payroll() {
    return this.adminService.payroll();
  }

  @Post('/payroll/:payrollid')
  payrollFromPayroll(@Param('payrollid') id: string) {
    return this.adminService.payrollFromPayroll(id);
  }

  @Get('/payroll/:payrollid/amount')
  payrollAmount(@Param('payrollid') id: string) {
    return this.adminService.fixPayrollAmount(id);
  }

  @Get('/fix')
  getFix() {
    return this.adminService.getFix();
  }
}
