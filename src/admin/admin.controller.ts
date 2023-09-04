import { Controller, Get, Post } from '@nestjs/common';
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
}
