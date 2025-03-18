export enum Ranks {
  NONE = 'none',
  CONSTRUCTOR = 'constructor',
  ESTRELLA = 'estrella',
  EMPRENDEDOR = 'emprendedor',
  EMPRENDEDOR_PLATA = 'emprendedor_plata',
  EMPRENDEDOR_ORO = 'emprendedor_oro',
  EMPRENDEDOR_PLATINO = 'emprendedor_platino',
  DIRECTOR_REGIONAL = 'director_regional',
  DIRECTOR_NACIONAL = 'director_nacional',
  DIRECTOR_INTERNACIONAL = 'director_internacional',
  EMBAJADOR = 'embajador',
  EMBAJADOR_CORONA = 'embajador_corona',
  EMBAJADOR_ELITE = 'embajador_elite',
}

export const ranksPoints: Record<Ranks, number> = {
  [Ranks.EMBAJADOR_ELITE]: 2_300_000,
  [Ranks.EMBAJADOR_CORONA]: 600_000,
  [Ranks.EMBAJADOR]: 180_000,
  [Ranks.DIRECTOR_INTERNACIONAL]: 72_000,
  [Ranks.DIRECTOR_NACIONAL]: 35_000,
  [Ranks.DIRECTOR_REGIONAL]: 25_000,
  [Ranks.EMPRENDEDOR_PLATINO]: 15_000,
  [Ranks.EMPRENDEDOR_ORO]: 12_000,
  [Ranks.EMPRENDEDOR_PLATA]: 8_000,
  [Ranks.EMPRENDEDOR]: 6_000,
  [Ranks.ESTRELLA]: 1_500,
  [Ranks.CONSTRUCTOR]: 500,
  [Ranks.NONE]: 0,
};

export const ranksOrder = [
  Ranks.CONSTRUCTOR,
  Ranks.ESTRELLA,
  Ranks.EMPRENDEDOR,
  Ranks.EMPRENDEDOR_PLATA,
  Ranks.EMPRENDEDOR_ORO,
  Ranks.EMPRENDEDOR_PLATINO,
  Ranks.DIRECTOR_REGIONAL,
  Ranks.DIRECTOR_NACIONAL,
  Ranks.DIRECTOR_INTERNACIONAL,
  Ranks.EMBAJADOR,
  Ranks.EMBAJADOR_CORONA,
  Ranks.EMBAJADOR_ELITE,
];

export type RankDetail = {
  display: string;
  key: Ranks;
  order: number;
  ranks: Ranks[][];
  bonus: number;
};

export const ranks_object: Record<Ranks, RankDetail> = {
  [Ranks.NONE]: {
    display: 'Ninguno',
    key: Ranks.NONE,
    order: -1,
    ranks: [],
    bonus: 0,
  },
  [Ranks.CONSTRUCTOR]: {
    display: 'Constructor',
    key: Ranks.CONSTRUCTOR,
    order: 0,
    ranks: [],
    bonus: 0,
  },
  [Ranks.ESTRELLA]: {
    display: 'Estrella',
    key: Ranks.ESTRELLA,
    order: 1,
    ranks: [],
    bonus: 0,
  },
  [Ranks.EMPRENDEDOR]: {
    display: 'Emprendedor',
    key: Ranks.EMPRENDEDOR,
    order: 2,
    ranks: [],
    bonus: 0,
  },
  [Ranks.EMPRENDEDOR_PLATA]: {
    display: 'Emprendedor Plata',
    key: Ranks.EMPRENDEDOR_PLATA,
    order: 3,
    ranks: [],
    bonus: 0,
  },
  [Ranks.EMPRENDEDOR_ORO]: {
    display: 'Emprendedor Oro',
    key: Ranks.EMPRENDEDOR_ORO,
    order: 4,
    ranks: [],
    bonus: 0,
  },
  [Ranks.EMPRENDEDOR_PLATINO]: {
    display: 'Emprendedor Platino',
    key: Ranks.EMPRENDEDOR_PLATINO,
    order: 5,
    ranks: [],
    bonus: 0,
  },
  [Ranks.DIRECTOR_REGIONAL]: {
    display: 'Director Regional',
    key: Ranks.DIRECTOR_REGIONAL,
    order: 6,
    ranks: [],
    bonus: 0,
  },
  [Ranks.DIRECTOR_NACIONAL]: {
    display: 'Director Nacional',
    key: Ranks.DIRECTOR_NACIONAL,
    order: 7,
    ranks: [],
    bonus: 0,
  },
  [Ranks.DIRECTOR_INTERNACIONAL]: {
    display: 'Director Internacional',
    key: Ranks.DIRECTOR_INTERNACIONAL,
    order: 8,
    ranks: [],
    bonus: 0,
  },
  [Ranks.EMBAJADOR]: {
    display: 'Embajador',
    key: Ranks.EMBAJADOR,
    order: 9,
    ranks: [],
    bonus: 0,
  },
  [Ranks.EMBAJADOR_CORONA]: {
    display: 'Embajador Corona',
    key: Ranks.EMBAJADOR_CORONA,
    order: 10,
    ranks: [],
    bonus: 0,
  },
  [Ranks.EMBAJADOR_ELITE]: {
    display: 'Embajador Elite',
    key: Ranks.EMBAJADOR_ELITE,
    order: 11,
    ranks: [],
    bonus: 0,
  },
};

export const getBinaryPercent = () => {
  return 0.1;
};

export const rank_points: Record<Memberships, number> = {
  FA1000: 200,
  FA2000: 400,
  FA5000: 1000,
  FB200: 200,
  FB500: 500,
  FB79: 79,
  FT1499: 1499,
  FT2499: 2499,
};
