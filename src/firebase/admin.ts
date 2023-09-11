import admin from 'firebase-admin';
import adminCredentials from './firebaseConfigAdmin';

admin.initializeApp({
  credential: admin.credential.cert(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    adminCredentials,
  ),
});

export const auth = admin.auth();
export const db = admin.firestore();
