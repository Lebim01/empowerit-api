import { Ranks } from './ranks.service';

export const ranks_object = {
  [Ranks.NONE]: { display: 'Ninguno', key: Ranks.NONE, order: -1 },
  [Ranks.INITIAL_BUILD]: {
    display: 'Initial Builder',
    key: [Ranks.INITIAL_BUILD],
    order: 1,
  },
  [Ranks.STAR_BUILD]: {
    display: 'Star Builder',
    key: Ranks.STAR_BUILD,
    order: 2,
  },
  [Ranks.ADVANCED_BUILDER]: {
    display: 'Advanced Builder',
    key: Ranks.ADVANCED_BUILDER,
    order: 3,
  },
  [Ranks.MASTER_1000]: {
    display: 'Master 1000',
    key: Ranks.MASTER_1000,
    order: 4,
  },
  [Ranks.MASTER_1500]: {
    display: 'Master 1500',
    key: Ranks.MASTER_1500,
    order: 5,
  },
  [Ranks.MASTER_2500]: {
    display: 'Master 2500',
    key: Ranks.MASTER_2500,
    order: 6,
  },
  [Ranks.REGIONAL_DIRECTOR]: {
    display: 'Regional Director',
    key: Ranks.REGIONAL_DIRECTOR,
    order: 7,
  },
  [Ranks.NATIONAL_DIRECTOR]: {
    display: 'National Director',
    key: Ranks.NATIONAL_DIRECTOR,
    order: 8,
  },
  [Ranks.INTERNATIONAL_DIRECTOR]: {
    display: 'International Director',
    key: Ranks.INTERNATIONAL_DIRECTOR,
    order: 9,
  },
  [Ranks.TOP_DIAMOND]: {
    display: 'Top Diamond',
    key: Ranks.TOP_DIAMOND,
    order: 10,
  },
  [Ranks.TOP_1]: { display: 'Top 1%', key: Ranks.TOP_1, order: 11 },
  [Ranks.TOP_LEGEND]: {
    display: 'Top Legend',
    key: Ranks.TOP_LEGEND,
    order: 12,
  },
};
