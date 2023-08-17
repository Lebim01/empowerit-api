import { Controller, Get, Param } from '@nestjs/common';
import { ScholarshipService } from './scholarship.service';

@Controller('scholarship')
export class ScholarshipController {
  constructor(private scholarshipService: ScholarshipService) {}

  @Get(':idUser')
  hasScholarship(@Param('idUser') idUser: string) {
    return this.scholarshipService.hasScholarship(idUser);
  }
}
