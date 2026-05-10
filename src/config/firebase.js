import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAXTDjuVvMrXxcsqCRVPhNMMoOLEEvS6II",
  authDomain: "ziniquest-9cff3.firebaseapp.com",
  projectId: "ziniquest-9cff3",
  storageBucket: "ziniquest-9cff3.firebasestorage.app",
  messagingSenderId: "1028287510872",
  appId: "1:1028287510872:web:03ba477adc4d268563cd2d"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const functions = getFunctions(app);