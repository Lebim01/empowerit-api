import { Controller, Get, Param, Post } from '@nestjs/common';
import { ScholarshipService } from './scholarship.service';
import { BondsService } from '../bonds/bonds.service';

@Controller('scholarship')
export class ScholarshipController {
  constructor(
    private scholarshipService: ScholarshipService,
    private readonly bondService: BondsService,
  ) {}

  @Get(':idUser')
  hasScholarship(@Param('idUser') idUser: string) {
    return this.scholarshipService.hasScholarship(idUser);
  }

  @Post('add/:idUser')
  addDirectPeople(@Param('idUser') idUser: string) {
    return this.scholarshipService.addDirectPeople(idUser);
  }

  @Post('use/:idUser')
  useSchorlarship(@Param('idUser') idUser: string) {
    return this.scholarshipService.useSchorlarship(idUser);
  }

  @Post('distributeBond/:idUser')
  distributeBond(@Param('idUser') idUser: string) {
    return this.scholarshipService.distributeBond(idUser);
  }

  @Post('users')
  useScholarship() {
    return this.scholarshipService.useAllScholarship();
  }
}
