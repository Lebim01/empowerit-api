export const productsIDS = {
  digest: '48640691732753',
  your_energy: '48648947073297',
  uritea: '48649254699281',
  wake_up_coffe: '48648843395345',
  body_clean: '48596930068753',
  gluco: '48640706445585',
  inmun: '48640709525777',
  piurakama: '48640774340881',
  premium_protein: '48640740458769',
  relaxing: '48648793358609',
  repair: '48648736309521',
  vitamin: '48648702263569',
};

type ListItem = {
  id: string;
  quantity: number;
};

export const alivePack: ListItem[] = [
  {
    id: productsIDS.uritea,
    quantity: 2,
  },
  {
    id: productsIDS.digest,
    quantity: 1,
  },
  {
    id: productsIDS.your_energy,
    quantity: 1,
  },
  {
    id: productsIDS.wake_up_coffe,
    quantity: 1,
  },
];

export const freedomPack: ListItem[] = [
  {
    id: productsIDS.premium_protein,
    quantity: 1,
  },
  {
    id: productsIDS.wake_up_coffe,
    quantity: 1,
  },
  {
    id: productsIDS.digest,
    quantity: 1,
  },
  {
    id: productsIDS.your_energy,
    quantity: 1,
  },
  {
    id: productsIDS.body_clean,
    quantity: 1,
  },
  {
    id: productsIDS.gluco,
    quantity: 1,
  },
  {
    id: productsIDS.relaxing,
    quantity: 1,
  },
  {
    id: productsIDS.repair,
    quantity: 1,
  },
  {
    id: productsIDS.inmun,
    quantity: 1,
  },
  {
    id: productsIDS.vitamin,
    quantity: 1,
  },
  {
    id: productsIDS.piurakama,
    quantity: 1,
  },
  {
    id: productsIDS.uritea,
    quantity: 9,
  },
];

export const businessPack: ListItem[] = [
  {
    id: productsIDS.premium_protein,
    quantity: 3,
  },
  {
    id: productsIDS.wake_up_coffe,
    quantity: 3,
  },
  {
    id: productsIDS.digest,
    quantity: 3,
  },
  {
    id: productsIDS.your_energy,
    quantity: 3,
  },
  {
    id: productsIDS.body_clean,
    quantity: 3,
  },
  {
    id: productsIDS.gluco,
    quantity: 3,
  },
  {
    id: productsIDS.relaxing,
    quantity: 3,
  },
  {
    id: productsIDS.repair,
    quantity: 3,
  },
  {
    id: productsIDS.inmun,
    quantity: 3,
  },
  {
    id: productsIDS.vitamin,
    quantity: 3,
  },
  {
    id: productsIDS.piurakama,
    quantity: 3,
  },
  {
    id: productsIDS.uritea,
    quantity: 9,
  },
];

export const elitePack = alivePack;

export const vipPack = freedomPack;
