import { Ranks, ranksOrder } from './ranks.service';

export const ranks_object = {
  [Ranks.NONE]: {
    display: 'Ninguno',
    key: Ranks.NONE,
    order: ranksOrder[Ranks.NONE],
  },
  [Ranks.INITIAL_BUILD]: {
    display: 'Initial Builder',
    key: [Ranks.INITIAL_BUILD],
    order: ranksOrder[Ranks.INITIAL_BUILD],
  },
  [Ranks.STAR_BUILD]: {
    display: 'Star Builder',
    key: Ranks.STAR_BUILD,
    order: ranksOrder[Ranks.STAR_BUILD],
  },
  [Ranks.ADVANCED_BUILDER]: {
    display: 'Advanced Builder',
    key: Ranks.ADVANCED_BUILDER,
    order: ranksOrder[Ranks.ADVANCED_BUILDER],
  },
  [Ranks.MASTER_1000]: {
    display: 'Master 1000',
    key: Ranks.MASTER_1000,
    order: ranksOrder[Ranks.MASTER_1000],
  },
  [Ranks.MASTER_1500]: {
    display: 'Master 1500',
    key: Ranks.MASTER_1500,
    order: ranksOrder[Ranks.MASTER_1500],
  },
  [Ranks.MASTER_2500]: {
    display: 'Master 2500',
    key: Ranks.MASTER_2500,
    order: ranksOrder[Ranks.MASTER_2500],
  },
  [Ranks.REGIONAL_DIRECTOR]: {
    display: 'Regional Director',
    key: Ranks.REGIONAL_DIRECTOR,
    order: ranksOrder[Ranks.REGIONAL_DIRECTOR],
  },
  [Ranks.NATIONAL_DIRECTOR]: {
    display: 'National Director',
    key: Ranks.NATIONAL_DIRECTOR,
    order: ranksOrder[Ranks.NATIONAL_DIRECTOR],
  },
  [Ranks.INTERNATIONAL_DIRECTOR]: {
    display: 'International Director',
    key: Ranks.INTERNATIONAL_DIRECTOR,
    order: ranksOrder[Ranks.INTERNATIONAL_DIRECTOR],
  },
  [Ranks.TOP_DIAMOND]: {
    display: 'Top Diamond',
    key: Ranks.TOP_DIAMOND,
    order: ranksOrder[Ranks.TOP_DIAMOND],
  },
  [Ranks.TOP_1]: {
    display: 'Top 1%',
    key: Ranks.TOP_1,
    order: ranksOrder[Ranks.TOP_1],
  },
  [Ranks.TOP_LEGEND]: {
    display: 'Top Legend',
    key: Ranks.TOP_LEGEND,
    order: ranksOrder[Ranks.TOP_LEGEND],
  },
};
