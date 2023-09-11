import serviceAccountProd from './adminKeyProd.json';
import serviceAccountDev from './adminKeyDev.json';

const credentials =
  process.env.CUSTOM_ENV == 'production'
    ? serviceAccountProd
    : serviceAccountDev;

export default credentials;
