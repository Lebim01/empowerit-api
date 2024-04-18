export type PayloadNewShip = {
  total_shipping_price_set: {
    shop_money: { amount: '0.00'; currency_code: 'MXN' };
    presentment_money: { amount: '0.00'; currency_code: 'MXN' };
  };
  total_tax: '0.00';
  total_tax_set: {
    shop_money: { amount: '0.00'; currency_code: 'MXN' };
    presentment_money: { amount: '0.00'; currency_code: 'MXN' };
  };
  total_tip_received: '0.00';
  total_weight: 0;
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
  line_items: [
    {
      id: 14700737069329;
      admin_graphql_api_id: 'gid://shopify/LineItem/14700737069329';
      attributed_staffs: [];
      current_quantity: 1;
      fulfillable_quantity: 1;
      fulfillment_service: 'manual';
      fulfillment_status: null;
      gift_card: false;
      grams: 0;
      name: 'Wake Up Coffe';
      price: '519.00';
      price_set: [Object];
      product_exists: true;
      product_id: 9432026972433;
      properties: [];
      quantity: 1;
      requires_shipping: true;
      sku: '';
      taxable: false;
      title: 'Wake Up Coffe';
      total_discount: '0.00';
      total_discount_set: [Object];
      variant_id: 48648843395345;
      variant_inventory_management: 'shopify';
      variant_title: null;
      vendor: 'Empowerit Top';
      tax_lines: [];
      duties: [];
      discount_allocations: [];
    },
  ];
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
      discounted_price_set: [Object];
      is_removed: false;
      phone: null;
      price: '0.00';
      price_set: [Object];
      requested_fulfillment_service_id: null;
      source: 'shopify';
      title: 'Standard';
      tax_lines: [];
      discount_allocations: [];
    },
  ];
};
