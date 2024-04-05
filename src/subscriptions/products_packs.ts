export const productsIDS = {
  digest: '9427848626449',
  your_energy: '9432042504465',
  uritea: '9432090476817',
  wake_up_coffe: '9432026972433',
  body_clean: '9412028563729',
  gluco: '9427859144977',
  inmun: '9427861373201',
  piurakama: '9427907150097',
  premium_protein: '9427884474641',
  relaxing: '9432017928465',
  repair: '9432008294673',
  vitamin: '9432002494737',
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
