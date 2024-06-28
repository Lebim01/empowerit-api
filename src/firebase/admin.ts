import admin from 'firebase-admin';
import adminCredentials from './firebaseConfigAdmin';

const isProd = process.env.NODE_ENV == 'production'
const databaseName = isProd ? '(default)' : 'testing'

admin.initializeApp({
  credential: admin.credential.cert(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    adminCredentials,
  ),
});

export const auth = admin.auth();
export const db = admin.firestore();

/* db.settings({
  databaseId: databaseName
})
 */