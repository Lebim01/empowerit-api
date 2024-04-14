export interface CustomerInput {
  id?: number;
  addresses: MailingAddressInput[];
  email: string;
  emailMarketingConsent?: unknown;
  firstName: string;
  lastName?: string;
  locale?: string;
  metafields?: MetafieldInput[];
  note?: string;
  phone?: string;
  privateMetafields?: unknown[];
  smsMarketingConsent?: unknown;
  tags?: string[];
  taxExempt?: boolean;
  taxExemptions?: any[];
}

export interface CustomerCreateInput {
  acceptsMarketing: boolean;
  email: string;
  firstName: string;
  lastName?: string;
  password: string;
  phone?: string;
}

export interface MailingAddressInput {
  address1: string;
  address2: string;
  city: string;
  company: string;
  country: string;
  countryCode: string;
  firstName: string;
  id?: number;
  lastName: string;
  phone: string;
  province: string;
  provinceCode: string;
  zip: string;
}

export interface MetafieldInput {
  description: string;
  id: number;
  key: string;
  namespace: string;
  type: string;
  value: string;
}

export enum CustomerMarketingOptInLevel {
  CONFIRMED_OPT_IN = 'CONFIRMED_OPT_IN',
  SINGLE_OPT_IN = 'SINGLE_OPT_IN',
  UNKNOWN = 'UNKNOWN',
}
export enum CustomerEmailMarketingState {
  INVALID = 'INVALID',
  NOT_SUBSCRIBED = 'NOT_SUBSCRIBED',
  PENDING = 'PENDING',
  REDACTED = 'REDACTED',
  SUBSCRIBED = 'SUBSCRIBED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
}
export interface CustomerEmailMarketingConsentUpdateInput {
  customerId: string;
  emailMarketingConsent: CustomerEmailMarketingConsentInput;
}
export interface CustomerEmailMarketingConsentInput {
  consentUpdatedAt: Date;
  marketingOptInLevel: CustomerMarketingOptInLevel;
  marketingState: CustomerEmailMarketingState;
}
