/**
 * Puntos que ganas al inscribir un paquete
 */
export const pack_points: Record<Memberships, number> = {
  'alive-pack': 65,
  'freedom-pack': 240,
  pro: 50,
  supreme: 100,
  'elite-pack': 115,
  'vip-pack': 340,
  'business-pack': 650,
};

export const pack_points_yearly: Record<'pro' | 'supreme', number> = {
  pro: 500,
  supreme: 1000,
};

export const pack_binary: Record<Memberships, number> = {
  'alive-pack': 10 / 100,
  'freedom-pack': 15 / 100,
  'business-pack': 15 / 100,
  pro: 10 / 100,
  supreme: 15 / 100,
  'elite-pack': 15 / 100,
  'vip-pack': 15 / 100,
};
