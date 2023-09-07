import { Injectable } from '@nestjs/common';
import {
  Country,
  State,
  City,
  IState,
  ICountry,
  ICity,
} from 'country-state-city';

interface ICountryStateCity {
  label: string;
  value: string;
}

export type CustomCountry = ICountryStateCity;
export type CustomState = ICountryStateCity;
export type CustomCity = ICountryStateCity;

@Injectable()
export class LocationService {
  getCountries(): CustomCountry[] {
    const countries: CustomCountry[] = Country.getAllCountries().map(
      (country: ICountry) => ({
        label: country.name,
        value: country.isoCode,
      }),
    );

    return countries;
  }

  getStates(countryCode: string): CustomState[] {
    const states: CustomState[] = State.getStatesOfCountry(countryCode).map(
      (state: IState) => ({
        label: state.name,
        value: state.isoCode + '-' + state.countryCode,
      }),
    );

    return states;
  }

  getCities(state: string): CustomCity[] {
    const stateCode = state.split('-')[0];
    const countryCode = state.split('-')[1];

    const cities: CustomCity[] = City.getCitiesOfState(
      countryCode,
      stateCode,
    ).map((city: ICity) => ({
      label: city.name,
      value: city.name,
    }));

    return cities;
  }
}
