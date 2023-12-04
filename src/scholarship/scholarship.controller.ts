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
}
