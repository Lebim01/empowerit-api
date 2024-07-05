import { ADMIN_BINARY_PERCENT } from '../admin/admin.service';
import { ADMIN_USERS } from '../constants';

/**
 * Puntos que ganas al inscribir un paquete
 */
export const pack_points: Record<Memberships, number> = {
  'alive-pack': 65,
  'freedom-pack': 240,
  pro: 50,
  supreme: 100,
  'business-pack': 650,
  'vip-pack': 115,
  'elite-pack': 340,
  'founder-pack': 0,
  '100-pack': 50,
  '300-pack': 150,
  '500-pack': 250,
  '1000-pack': 500,
  '2000-pack': 1000,
  '3000-pack': 300,
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
  'vip-pack': 15 / 100,
  'elite-pack': 15 / 100,
  '100-pack': 10 / 100,
  '300-pack': 10 / 100,
  '500-pack': 10 / 100,
  '1000-pack': 15 / 100,
  '2000-pack': 15 / 100,
  'founder-pack': 0,
  '3000-pack': 15 / 100,
};

export const getBinaryPercent = (user_id: string, membership: string) => {
  const isAdmin = ADMIN_USERS.includes(user_id);
  const binary_percent = isAdmin
    ? ADMIN_BINARY_PERCENT
    : pack_binary[membership];
  return binary_percent;
};
