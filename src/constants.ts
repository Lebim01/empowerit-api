export const ADMIN_USERS = ['8ribFRrOf2PKYV65237eSwjGD6A2'];

export const delay = (ms: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
};

export const MEMBERSHIPS_PRICES: Record<Memberships, number> = {
  FA1000: 1000,
  FA2000: 2000,
  FA5000: 5000,
  FB200: 200,
  FB500: 500,
  FB79: 79,
  FT1499: 1499,
  FT2499: 2499,
};
