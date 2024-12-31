export const ADMIN_USERS = ['8ribFRrOf2PKYV65237eSwjGD6A2'];

export const delay = (ms: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
};

export const MEMBERSHIPS_PRICES = {
  FA500: 599,
  FA1000: 1099,
  FA2000: 2199,
  FA5000: 5199,
  FA10000: 10299,
  FA20000: 20299,
  FP200: 200,
  FP300: 300,
  FP500: 500,
  FD200: 200,
  FD300: 300,
  FD500: 500,
  '49-pack': 49,
  '100-pack': 100,
  '300-pack': 300,
  '500-pack': 500,
  '1000-pack': 1000,
  '2000-pack': 2000,
  '3000-pack': 3000,
  '30-credits': 30,
  '50-credits': 50,
  '100-credits': 100,
  '500-credits': 500,
  '1000-credits': 1000
};
