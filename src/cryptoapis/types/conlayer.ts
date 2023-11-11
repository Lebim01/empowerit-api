export type ResponseConvert = {
  success: boolean;
  terms: 'https://coinlayer.com/terms';
  privacy: 'https://coinlayer.com/privacy';
  query: {
    from: string;
    to: string;
    amount: number;
  };
  info: {
    timestamp: number;
    rate: number;
  };
  result: number;
};
