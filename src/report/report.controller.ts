import { Controller, Get, Post, Response } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('topProfits')
  topProfits() {
    return this.reportService.getTopProfitsMonth(8);
  }

  @Post('restartMonth')
  restartMonth() {
    return this.reportService.restartMonth();
  }

  @Get('month')
  reportMonth() {
    return this.reportService.topMes('2023-08').then((r) => r.join('\n'));
  }
}
