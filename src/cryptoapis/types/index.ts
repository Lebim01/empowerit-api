export interface ResponseCreateWalletAddress {
  apiVersion: string;
  requestId: string;
  context: string;
  data: {
    item: {
      address: string;
      createdTimestamp: number;
      label: string;
    };
  };
}

export interface ResponseNewUnconfirmedCoinsTransactions {
  apiVersion: string;
  requestId: string;
  context: string;
  data: {
    item: {
      address: string;
      callbackSecretKey: string;
      callbackUrl: string;
      createdTimestamp: number;
      eventType: 'ADDRESS_COINS_TRANSACTION_UNCONFIRMED';
      isActive: boolean;
      referenceId: string;
    };
  };
}
