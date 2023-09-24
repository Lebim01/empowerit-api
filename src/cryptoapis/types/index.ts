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

export interface CallbackNewUnconfirmedCoins {
  apiVersion: string;
  referenceId: string;
  idempotencyKey: string;
  data: {
    product: 'BLOCKCHAIN_EVENTS';
    event: 'ADDRESS_COINS_TRANSACTION_UNCONFIRMED';
    item: {
      blockchain: 'bitcoin';
      network: 'testnet' | 'mainnet';
      address: string;
      transactionId: string;
      amount: string;
      unit: 'BTC';
      direction: 'incoming' | 'outgoing';
      firstSeenInMempoolTimestamp: number;
    };
  };
}

export interface ResponseNewConfirmedCoinsTransactions {
  apiVersion: string;
  requestId: string;
  context: string;
  data: {
    item: {
      address: string;
      callbackSecretKey: string;
      callbackUrl: string;
      confirmationsCount: number;
      createdTimestamp: number;
      eventType: 'ADDRESS_COINS_TRANSACTION_CONFIRMED_EACH_CONFIRMATION';
      isActive: boolean;
      referenceId: string;
    };
  };
}

export interface CallbackNewConfirmedCoins {
  apiVersion: string;
  referenceId: string;
  idempotencyKey: string;
  data: {
    product: 'BLOCKCHAIN_EVENTS';
    event: 'ADDRESS_COINS_TRANSACTION_CONFIRMED';
    item: {
      blockchain: 'bitcoin';
      network: 'testnet' | 'mainnet';
      address: string;
      minedInBlock: {
        height: number;
        hash: string;
        timestamp: number;
      };
      transactionId: string;
      amount: string;
      unit: 'BTC';
      direction: 'incoming' | 'outgoing';
    };
  };
}

export interface ResponseBalanceAddress {
  apiVersion: string;
  requestId: string;
  context: string;
  data: {
    item: {
      confirmedBalance: {
        amount: string;
        unit: 'BTC';
      };
    };
  };
}

export interface ResponseListOfEvents {
  apiVersion: '2023-04-25';
  requestId: '601c1710034ed6d407996b30';
  context: 'yourExampleString';
  data: {
    limit: 50;
    offset: 0;
    total: 100;
    items: {
      address: string;
      callbackSecretKey: string;
      callbackUrl: string;
      confirmationsCount: number;
      createdTimestamp: number;
      deactivationReasons: { reason: string; timestamp: number }[];
      eventType: string;
      isActive: boolean;
      referenceId: string;
      transactionId: string;
    }[];
  };
}
