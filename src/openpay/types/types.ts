type ChangeSuccess = {
  type: 'charge.succeeded' | 'payout.failed' | 'spei.recived';
  event_date: Date;
  transaction: {
    id: string;
    authorization: string;
    operation_type: string;
    transaction_type: string;
    status: string;
    conciliated: boolean;
    creation_date: Date;
    operation_date: Date;
    description: string;
    error_message: null;
    order_id: null;
    card: {
      type: string;
      brand: string;
      address: null;
      card_number: string;
      holder_name: string;
      expiration_year: string;
      expiration_month: string;
      allows_charges: boolean;
      allows_payouts: boolean;
      bank_name: string;
      points_type: string;
      points_card: boolean;
      bank_code: string;
    };
    amount: number;
    customer: {
      name: string;
      last_name: string;
      email: string;
      phone_number: string;
      address: null;
      creation_date: Date;
      external_id: null;
      clabe: null;
    };
    fee: { amount: number; tax: number; currency: 'MXN' };
    payment_method: {
      type: string;
      url: string;
    };
    currency: 'MXN';
    method: 'card';
  };
};
