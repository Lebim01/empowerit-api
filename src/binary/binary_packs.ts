import { Ranks } from 'src/ranks/ranks_object';

export const binary_percent: Record<Ranks, number> = {
  none: 0.12,
  constructor: 0.12,
  estrella: 0.12,
  emprendedor: 0.12,
  emprendedor_plata: 0.1,
  emprendedor_oro: 0.1,
  emprendedor_platino: 0.1,
  director_regional: 0.09,
  director_internacional: 0.09,
  director_nacional: 0.09,
  embajador: 0.08,
  embajador_corona: 0.08,
  embajador_elite: 0.08,
};

export const binary_points: Record<Memberships, number> = {
  FA1000: 100,
  FA2000: 200,
  FA5000: 500,
  FB200: 100,
  FB500: 250,
  FB79: 40,
  FT1499: 374,
  FT2499: 624,
};
