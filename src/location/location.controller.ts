import { Controller, Get, Param } from '@nestjs/common';
import { LocationService } from './location.service';
import { CustomCountry, CustomCity, CustomState } from './location.service';

@Controller('location')
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Get('countries')
  getCountries(): CustomCountry[] {
    return this.locationService.getCountries();
  }

  @Get('states/:countryCode')
  getStates(@Param('countryCode') countryCode: string): CustomState[] {
    return this.locationService.getStates(countryCode);
  }

  @Get('cities/:state')
  getCities(@Param('state') state: string): CustomCity[] {
    return this.locationService.getCities(state);
  }
}
