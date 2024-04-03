import { MailingAddressInput } from './customers_schema';

export type WeightUnit = 'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS';

export type DraftOrderStatus = 'COMPLETED' | 'INVOICE_SENT' | 'OPEN';

export type PurchasingEntityInput = {
  customerId: string;
};

export type DraftOrderLineItemInput = {
  quantity: number;
  sku?: string;
  title?: string;
  requiresShipping?: boolean;
  taxable?: boolean;
  weight?: {
    unit: WeightUnit;
    value: number;
  };
  note?: string;
  // prefix: gid://shopify/ProductVariant/{id}
  variantId: string;
};

export type ListItem = {
  id: string;
  quantity: number;
};

export type ResponseCreate = {
  customerCreate: {
    customer: {
      id: string;
    };
    userErrors: {
      field: string[];
      message: string;
    }[];
  };
};

export type DraftOrderInput = {
  billingAddress?: MailingAddressInput;
  email?: string;
  phone?: string;
  lineItems?: DraftOrderLineItemInput[];
  shippingAddress?: MailingAddressInput;
  useCustomerDefaultAddress?: boolean;
  purchasingEntity?: PurchasingEntityInput;
};

export type ResponseCreateDraf = {
  draftOrderCreate: {
    draftOrder: {
      id: string;
      invoiceUrl: string;
      status: DraftOrderStatus;
    };
    userErrors: any[];
  };
};
