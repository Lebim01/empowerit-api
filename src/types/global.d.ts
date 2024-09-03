type PhisicMembership = 'alive-pack' | 'freedom-pack' | 'business-pack';

type HibridMembership = 'elite-pack' | 'vip-pack';

type AutomaticFranchises =
  | 'FA500'
  | 'FA1000'
  | 'FA2000'
  | 'FA5000'
  | 'FA10000'
  | 'FA20000';

type Memberships =
  | 'pro'
  | 'supreme'
  | 'founder-pack'
  | HibridMembership
  | PhisicMembership
  | Franchises;

type Coins = 'BTC' | 'LTC' | 'MXN';

type Franchises =
  | '49-pack'
  | '100-pack'
  | '300-pack'
  | '500-pack'
  | '1000-pack'
  | '2000-pack'
  | '3000-pack';

type Blockchains = 'bitcoin' | 'litecoin';

type PackCredits =
  | '30-credits'
  | '50-credits'
  | '100-credits'
  | '500-credits'
  | '1000-credits';

type PackParticipations = '3000-participation';
