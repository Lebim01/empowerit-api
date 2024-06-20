type PhisicMembership = 'alive-pack' | 'freedom-pack' | 'business-pack';

type HibridMembership = 'elite-pack' | 'vip-pack';

type Memberships =
  | 'pro'
  | 'supreme'
  | 'founder-pack'
  | HibridMembership
  | PhisicMembership
  | Franchises

type Coins = 'BTC' | 'LTC' | 'MXN';

type Franchises = '100-pack' | '300-pack' | '500-pack' | '1000-pack' | '2000-pack';

type Blockchains = 'bitcoin' | 'litecoin';

type PackCredits = '100-credits' | '500-credits' | '1000-credits'
