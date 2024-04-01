export enum Ranks {
  NONE = 'none',
  INITIAL_BUILD = 'initial_builder',
  STAR_BUILD = 'star_builder',
  ADVANCED_BUILDER = 'advanced_builder',
  MASTER_1000 = 'master_1000',
  MASTER_1500 = 'master_1500',
  MASTER_2500 = 'master_2500',
  REGIONAL_DIRECTOR = 'regional_director',
  NATIONAL_DIRECTOR = 'national_director',
  INTERNATIONAL_DIRECTOR = 'international_director',
  TOP_DIAMOND = 'top_diamond',
  TOP_1 = 'top_1',
  TOP_LEGEND = 'top_legend',
}

export const ranksPoints: Record<Ranks, number> = {
  [Ranks.TOP_LEGEND]: 2_300_000,
  [Ranks.TOP_1]: 600_000,
  [Ranks.TOP_DIAMOND]: 180_000,
  [Ranks.INTERNATIONAL_DIRECTOR]: 72_000,
  [Ranks.NATIONAL_DIRECTOR]: 35_000,
  [Ranks.REGIONAL_DIRECTOR]: 25_000,
  [Ranks.MASTER_2500]: 15_000,
  [Ranks.MASTER_1500]: 12_000,
  [Ranks.MASTER_1000]: 8_000,
  [Ranks.ADVANCED_BUILDER]: 6_000,
  [Ranks.STAR_BUILD]: 1_500,
  [Ranks.INITIAL_BUILD]: 500,
  [Ranks.NONE]: 0,
};

export const ranksOrder = [
  Ranks.INITIAL_BUILD,
  Ranks.STAR_BUILD,
  Ranks.ADVANCED_BUILDER,
  Ranks.MASTER_1000,
  Ranks.MASTER_1500,
  Ranks.MASTER_2500,
  Ranks.REGIONAL_DIRECTOR,
  Ranks.NATIONAL_DIRECTOR,
  Ranks.INTERNATIONAL_DIRECTOR,
  Ranks.TOP_DIAMOND,
  Ranks.TOP_1,
  Ranks.TOP_LEGEND,
];

export const ranks_object: Record<
  Ranks,
  { display: string; key: Ranks; order: number }
> = {
  [Ranks.NONE]: {
    display: 'Ninguno',
    key: Ranks.NONE,
    order: -1,
  },
  [Ranks.INITIAL_BUILD]: {
    display: 'Initial Builder',
    key: Ranks.INITIAL_BUILD,
    order: 0,
  },
  [Ranks.STAR_BUILD]: {
    display: 'Star Builder',
    key: Ranks.STAR_BUILD,
    order: 1,
  },
  [Ranks.ADVANCED_BUILDER]: {
    display: 'Advanced Builder',
    key: Ranks.ADVANCED_BUILDER,
    order: 2,
  },
  [Ranks.MASTER_1000]: {
    display: 'Master 1000',
    key: Ranks.MASTER_1000,
    order: 3,
  },
  [Ranks.MASTER_1500]: {
    display: 'Master 1500',
    key: Ranks.MASTER_1500,
    order: 4,
  },
  [Ranks.MASTER_2500]: {
    display: 'Master 2500',
    key: Ranks.MASTER_2500,
    order: 5,
  },
  [Ranks.REGIONAL_DIRECTOR]: {
    display: 'Regional Director',
    key: Ranks.REGIONAL_DIRECTOR,
    order: 6,
  },
  [Ranks.NATIONAL_DIRECTOR]: {
    display: 'National Director',
    key: Ranks.NATIONAL_DIRECTOR,
    order: 7,
  },
  [Ranks.INTERNATIONAL_DIRECTOR]: {
    display: 'International Director',
    key: Ranks.INTERNATIONAL_DIRECTOR,
    order: 8,
  },
  [Ranks.TOP_DIAMOND]: {
    display: 'Top Diamond',
    key: Ranks.TOP_DIAMOND,
    order: 9,
  },
  [Ranks.TOP_1]: {
    display: 'Top 1%',
    key: Ranks.TOP_1,
    order: 10,
  },
  [Ranks.TOP_LEGEND]: {
    display: 'Top Legend',
    key: Ranks.TOP_LEGEND,
    order: 11,
  },
};
