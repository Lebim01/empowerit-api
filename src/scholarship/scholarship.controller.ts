import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ScholarshipService } from './scholarship.service';

@Controller('scholarship')
export class ScholarshipController {
  constructor(private scholarshipService: ScholarshipService) {}

  @Get(':idUser')
  hasScholarship(@Param('idUser') idUser: string) {
    return this.scholarshipService.hasScholarship(idUser);
  }

  @Post('use/:idUser')
  useSchorlarship(@Param('idUser') idUser: string) {
    return this.scholarshipService.useSchorlarship(idUser);
  }

  @Post('users')
  useScholarship() {
    return this.scholarshipService.useAllScholarship();
  }

  @Post('residual')
  residual(@Body() body) {
    return this.scholarshipService.residual(body.id);
  }

  @Post('direct')
  direct(@Body() body) {
    return this.scholarshipService.direct(body.id);
  }

  @Post('scholarship')
  scholarship(@Body() body) {
    return this.scholarshipService.distributeBond(body.id, body.registerUser);
  }

  @Post('revisar')
  revisar(@Body() body) {
    return this.scholarshipService.revisar(body.id);
  }

  @Post('copyuser')
  copyuser(@Body() body) {
    return this.scholarshipService.copyuser(body.old, body.new, body);
  }
}
