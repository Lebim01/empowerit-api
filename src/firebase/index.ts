/* eslint-disable prettier/prettier */
import firebaseConfig from './serviceAccountKey';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const isProd = process.env.NODE_ENV == 'production'
const databaseName = isProd ? '(default)' : 'testing'

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app,databaseName);

export const auth = getAuth(app);
