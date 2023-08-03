import admin from 'firebase-admin';
import prod from './serviceAccountKey';

const credential = prod;

try {
  admin.initializeApp({
    credential: admin.credential.cert(credential),
  });
} catch (error: any) {
  /*
   * We skip the "already exists" message which is
   * not an actual error when we're hot-reloading.
   */
  if (!/already exists/u.test(error.message)) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

export default admin;
