import { Ranks } from '../ranks/ranks_object';

export enum Bonds {
  QUICK_START = 'bond_quick_start',
  MENTOR = 'bond_mentor',
  DIRECT_SALE = 'bond_direct_sale',
  BINARY = 'bond_binary',
  RANK = 'bond_rank',
}

/**
 * Porcentaje de ganancia bono mentor
 */
export const menthor_percent = 0.1;

export const messages: Record<Bonds, string> = {
  bond_quick_start: 'Bono de inicio rápido',
  bond_mentor: 'Bono Mentor',
  bond_direct_sale: 'Bono venta directa',
  bond_binary: 'Bono binario',
  bond_rank: 'Bono de rango',
};
