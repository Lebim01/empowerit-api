import admin from 'firebase-admin';

import serviceAccountProd from './adminKeyProd.json';
import serviceAccountDev from './adminKeyDev.json';

admin.initializeApp({
  credential: admin.credential.cert(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    process.env.ENV == 'production' ? serviceAccountProd : serviceAccountDev,
  ),
});

export const db = admin.firestore();
