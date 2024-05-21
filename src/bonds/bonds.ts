import { ADMIN_MENTOR_PERCENT, ADMIN_USERS } from '../admin/admin.service';
import { Ranks } from '../ranks/ranks_object';

export enum Bonds {
  PRESENTER = 'bond_presenter',
  QUICK_START = 'bond_quick_start',
  MENTOR = 'bond_mentor',
  CAR = 'bond_car',
  DIRECT_SALE = 'bond_direct_sale',
}

/**
 * Porcentaje de ganancia bono inicio rapido
 */
export const quick_start_percent: Record<Ranks, number> = {
  initial_builder: 20,
  star_builder: 20,
  advanced_builder: 20,
  master_1000: 20,
  master_1500: 20,
  master_2500: 20,
  regional_director: 20,
  national_director: 20,
  international_director: 20,
  top_diamond: 25,
  top_1: 25,
  top_legend: 30,
  none: 20,
};


/**
 * Porcentaje de ganancia bono inicio rapido de las neuvas Franquicias
 */
export const quick_start_percent_by_Franchise: Record<Franchises, number> = {
  '100-pack': 15,
  '300-pack': 15,
  '500-pack': 20,
  '1000-pack': 20,
  '2000-pack': 20,
};

/**
 * Porcentaje de ganancia bono mentor
 */
export const menthor_percent: Record<Ranks, number> = {
  initial_builder: 10,
  star_builder: 10,
  advanced_builder: 10,
  master_1000: 15,
  master_1500: 15,
  master_2500: 15,
  regional_director: 20,
  national_director: 20,
  international_director: 20,
  top_diamond: 30,
  top_1: 30,
  top_legend: 30,
  none: 10,
};

/**
 * Porcentaje de ganancia bono mentor ahora con las Franquicias
 */
export const menthor_percent_by_Franchise: Record<Franchises, number> = {
  '100-pack': 10,
  '300-pack': 15,
  '500-pack': 15,
  '1000-pack': 15,
  '2000-pack': 20,
};

export const BOND_CAR = 250;

export const messages: Record<Bonds, string> = {
  bond_quick_start: 'Bono de inicio rápido',
  bond_mentor: 'Bono Mentor',
  bond_car: 'Bono Auto',
  bond_direct_sale: 'Bono venta directa',
  bond_presenter: 'Bono presentador',
};

export const getMentorPercent = (id_user: string, membership: Franchises) => {
  const isAdmin = ADMIN_USERS.includes(id_user);
  return isAdmin
    ? ADMIN_MENTOR_PERCENT
    : menthor_percent_by_Franchise[membership] / 100;
};

export const getMentorPercentByRank = (id_user: string, rank: Ranks) => {
  const isAdmin = ADMIN_USERS.includes(id_user);
  return isAdmin ? ADMIN_MENTOR_PERCENT : menthor_percent[rank] / 100;
};
