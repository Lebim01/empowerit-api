import { Controller, Get, Param, Post } from '@nestjs/common';
import { ScholarshipService } from './scholarship.service';
import { BondsService } from '@/bonds/bonds.service';

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

  @Post('residual')
  async residual() {
    const ids = [
      '354cdLeywGNkmcha723r1t9crxP2',
      'fkQL4rwDBebtQgSXzZacf75DmCt1',
      'KRzOTaOSpfhthcClu0DZV93cnTc2',
      'dA8G8RinEvVNFgag8szm3OLqXZo1',
      'KlHd6EBDp1ebqCHytQqjX3afPEm2',
      'AJvuWop0yrczpkTQY1asHfJInZV2',
      'el1MJWe0Spf8SE5rZqTSVy0PKjO2',
      'uZuS82g3cMTbkFlz8Z5aZyFeTnd2',
      '9UUryg8zYbSaNJ2igb3qUwRSL5n1',
      'v7GwX9MXS7ZSw6I04uJyurE2piC3',
      'G3E5HN0K2XMDPPbO0BgkbGNfVZ33',
    ];
    for (const id of ids) {
      console.log('residual', id);
      await this.bondService.execUserResidualBond(id);
    }

    return ids;
  }
}
