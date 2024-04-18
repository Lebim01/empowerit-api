/**
 * id: 5777361404177,
  admin_graphql_api_id: 'gid://shopify/Order/5777361404177',
  app_id: 1354745,
  browser_ip: '2806:2f0:5680:fcba:ad7c:ad34:523d:2e30',
  buyer_accepts_marketing: false,
  cancel_reason: null,
  cancelled_at: null,
  cart_token: null,
  checkout_id: 37486234108177,
  checkout_token: 'ce3bd36ed318e2180f4363b1b0652a15',
  client_details: {
    accept_language: 'es',
    browser_height: null,
    browser_ip: '2806:2f0:5680:fcba:ad7c:ad34:523d:2e30',
    browser_width: null,
    session_hash: null,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 OPR/107.0.0.0'
  },
  closed_at: null,
  confirmation_number: 'YU0KVTR18',
  confirmed: true,
  contact_email: 'victoralvarezsaucedo@gmail.com',
  created_at: '2024-04-18T10:18:12-06:00',
  currency: 'MXN',
  current_subtotal_price: '399.00',
  current_subtotal_price_set: {
    shop_money: { amount: '399.00', currency_code: 'MXN' },
    presentment_money: { amount: '399.00', currency_code: 'MXN' }
  },
  current_total_additional_fees_set: null,
  current_total_discounts: '0.00',
  current_total_discounts_set: {
    shop_money: { amount: '0.00', currency_code: 'MXN' },
    presentment_money: { amount: '0.00', currency_code: 'MXN' }
  },
  current_total_duties_set: null,
  current_total_price: '399.00',
  current_total_price_set: {
    shop_money: { amount: '399.00', currency_code: 'MXN' },
    presentment_money: { amount: '399.00', currency_code: 'MXN' }
  },
  current_total_tax: '0.00',
  current_total_tax_set: {
    shop_money: { amount: '0.00', currency_code: 'MXN' },
    presentment_money: { amount: '0.00', currency_code: 'MXN' }
  },
  customer_locale: 'es',
  device_id: null,
  discount_codes: [],
  email: 'victoralvarezsaucedo@gmail.com',
  estimated_taxes: false,
  financial_status: 'paid',
  fulfillment_status: null,
  landing_site: '/',
  landing_site_ref: null,
  location_id: 96758268177,
  merchant_of_record_app_id: null,
  name: '#1005',
  note: null,
  note_attributes: [],
  number: 5,
  order_number: 1005,
  order_status_url: 'https://79ca82-85.myshopify.com/86637019409/orders/f2d243bb91df87784991f7a3122e865b/authenticate?key=e9d697e8ab38f33344ce59d0b0dd2c92',
  original_total_additional_fees_set: null,
  original_total_duties_set: null,
  payment_gateway_names: [ 'Openpay' ],
  phone: null,
  po_number: null,
  presentment_currency: 'MXN',
  processed_at: '2024-04-18T10:18:11-06:00',
  reference: 'e29432b49491a271c63a36d72a38def3',
  referring_site: '',
  source_identifier: 'e29432b49491a271c63a36d72a38def3',
  source_name: 'shopify_draft_order',
  source_url: null,
  subtotal_price: '399.00',
  subtotal_price_set: {
    shop_money: { amount: '399.00', currency_code: 'MXN' },
    presentment_money: { amount: '399.00', currency_code: 'MXN' }
  },
  tags: '',
  tax_exempt: false,
  tax_lines: [],
  taxes_included: false,
  test: true,
  token: 'f2d243bb91df87784991f7a3122e865b',
  total_discounts: '0.00',
  total_discounts_set: {
    shop_money: { amount: '0.00', currency_code: 'MXN' },
    presentment_money: { amount: '0.00', currency_code: 'MXN' }
  },
  total_line_items_price: '399.00',
  total_line_items_price_set: {
    shop_money: { amount: '399.00', currency_code: 'MXN' },
    presentment_money: { amount: '399.00', currency_code: 'MXN' }
  },
  total_outstanding: '0.00',
  total_price: '399.00',
  total_price_set: {
    shop_money: { amount: '399.00', currency_code: 'MXN' },
    presentment_money: { amount: '399.00', currency_code: 'MXN' }
  }
 */

export type PayloadNewShip = {
  id: number;
  admin_graphql_api_id: string;
  app_id: number;
  browser_ip: string;
  buyer_accepts_marketing: boolean;
  cancel_reason: null;
  cancelled_at: null;
  cart_token: null;
  checkout_id: number;
  checkout_token: string;
  client_details: {
    accept_language: 'es';
    browser_height: null;
    browser_ip: string;
    browser_width: null;
    session_hash: null;
    user_agent: string;
  };
  closed_at: null;
  confirmation_number: string;
  confirmed: boolean;
  contact_email: string;
  created_at: Date;
  currency: 'MXN';
  current_subtotal_price: string;
  current_subtotal_price_set: {
    shop_money: { amount: string; currency_code: 'MXN' };
    presentment_money: { amount: string; currency_code: 'MXN' };
  };
  current_total_additional_fees_set: null;
  current_total_discounts: '0.00';
  current_total_discounts_set: {
    shop_money: { amount: '0.00'; currency_code: 'MXN' };
    presentment_money: { amount: '0.00'; currency_code: 'MXN' };
  };
  current_total_duties_set: null;
  current_total_price: string;
  current_total_price_set: {
    shop_money: { amount: string; currency_code: 'MXN' };
    presentment_money: { amount: string; currency_code: 'MXN' };
  };
  current_total_tax: '0.00';
  current_total_tax_set: {
    shop_money: { amount: '0.00'; currency_code: 'MXN' };
    presentment_money: { amount: '0.00'; currency_code: 'MXN' };
  };
  customer_locale: 'es';
  device_id: null;
  discount_codes: [];
  email: string;
  estimated_taxes: false;
  financial_status: 'paid' | string;
  fulfillment_status: null;
  landing_site: '/';
  landing_site_ref: null;
  location_id: number;
  merchant_of_record_app_id: null;
  name: string;
  note: null;
  note_attributes: [];
  number: number;
  order_number: number;
  order_status_url: string;
  original_total_additional_fees_set: null;
  original_total_duties_set: null;
  payment_gateway_names: ['Openpay'];
  phone: null;
  po_number: null;
  presentment_currency: 'MXN';
  processed_at: Date;
  reference: string;
  referring_site: '';
  source_identifier: string;
  source_name: string;
  source_url: null;
  subtotal_price: string;
  subtotal_price_set: {
    shop_money: { amount: string; currency_code: 'MXN' };
    presentment_money: { amount: string; currency_code: 'MXN' };
  };
  tags: '';
  tax_exempt: boolean;
  tax_lines: [];
  taxes_included: boolean;
  test: boolean;
  token: string;
  total_discounts: string;
  total_discounts_set: {
    shop_money: { amount: string; currency_code: 'MXN' };
    presentment_money: { amount: string; currency_code: 'MXN' };
  };
  total_line_items_price: string;
  total_line_items_price_set: {
    shop_money: { amount: string; currency_code: 'MXN' };
    presentment_money: { amount: string; currency_code: 'MXN' };
  };
  total_outstanding: '0.00';
  total_price: string;
  total_price_set: {
    shop_money: { amount: string; currency_code: 'MXN' };
    presentment_money: { amount: string; currency_code: 'MXN' };
  };
  total_shipping_price_set: {
    shop_money: { amount: '0.00'; currency_code: 'MXN' };
    presentment_money: { amount: '0.00'; currency_code: 'MXN' };
  };
  total_tax: string;
  total_tax_set: {
    shop_money: { amount: '0.00'; currency_code: 'MXN' };
    presentment_money: { amount: '0.00'; currency_code: 'MXN' };
  };
  total_tip_received: string;
  total_weight: number;
  updated_at: Date;
  user_id: null;
  billing_address: {
    first_name: string;
    address1: string;
    phone: null;
    city: string;
    zip: string;
    province: string;
    country: string;
    last_name: string;
    address2: null;
    company: null;
    latitude: null;
    longitude: null;
    name: string;
    country_code: string;
    province_code: string;
  };
  customer: {
    id: number;
    email: string;
    created_at: Date;
    updated_at: Date;
    first_name: string;
    last_name: string;
    state: 'disabled' | string;
    note: null;
    verified_email: true;
    multipass_identifier: null;
    tax_exempt: false;
    phone: null;
    email_marketing_consent: {
      state: 'not_subscribed' | string;
      opt_in_level: 'single_opt_in' | string;
      consent_updated_at: null;
    };
    sms_marketing_consent: null;
    tags: '';
    currency: 'MXN';
    tax_exemptions: [];
    admin_graphql_api_id: string;
    default_address: {
      id: number;
      customer_id: number;
      first_name: string;
      last_name: string;
      company: null;
      address1: string;
      address2: null;
      city: string;
      province: string;
      country: string;
      zip: string;
      phone: null;
      name: string;
      province_code: string;
      country_code: string;
      country_name: string;
      default: boolean;
    };
  };
  discount_applications: [];
  fulfillments: [];
  line_items: LineItem[];
  payment_terms: null;
  refunds: [];
  shipping_address: {
    first_name: 'VICTOR';
    address1: 'DE LOS DOMINICOS 10918';
    phone: null;
    city: 'mazatlan';
    zip: '82134';
    province: 'Sinaloa';
    country: 'Mexico';
    last_name: 'ALVAREZ';
    address2: null;
    company: null;
    latitude: 23.2878987;
    longitude: -106.3976271;
    name: 'VICTOR ALVAREZ';
    country_code: 'MX';
    province_code: 'SIN';
  };
  shipping_lines: [
    {
      id: 4679623606545;
      carrier_identifier: '4084464f694a06e6683c491d00cef27f';
      code: 'Standard';
      discounted_price: '0.00';
      discounted_price_set: any[];
      is_removed: false;
      phone: null;
      price: '0.00';
      price_set: any[];
      requested_fulfillment_service_id: null;
      source: 'shopify';
      title: 'Standard';
      tax_lines: [];
      discount_allocations: [];
    },
  ];
};

type LineItem = {
  id: number;
  admin_graphql_api_id: string;
  attributed_staffs: [];
  current_quantity: number;
  fulfillable_quantity: number;
  fulfillment_service: 'manual' | string;
  fulfillment_status: null;
  gift_card: boolean;
  grams: number;
  name: string;
  price: string;
  price_set: any[];
  product_exists: boolean;
  product_id: number;
  properties: [];
  quantity: number;
  requires_shipping: boolean;
  sku: string;
  taxable: boolean;
  title: string;
  total_discount: string;
  total_discount_set: any[];
  variant_id: number;
  variant_inventory_management: 'shopify';
  variant_title: null;
  vendor: string;
  tax_lines: [];
  duties: [];
  discount_allocations: [];
};
